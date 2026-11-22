import postgres from "postgres";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { maintenanceAuthorized } from "@/lib/maintenance-auth";
import { cleanupTemporaryData } from "@/lib/temporary-cleanup";
import { photoVariantWidths } from "@/lib/media";
import { photoVariantKey } from "@/lib/server/photo-variants";
import { storage, originalsBucket, displayBucket } from "@/lib/server/media";
import { errorResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (
    !maintenanceAuthorized(
      request.headers.get("Authorization"),
      process.env.CRON_SECRET,
    )
  )
    return Response.json(
      { error: "Not authorized." },
      { status: 401, headers },
    );
  const dryRun = new URL(request.url).searchParams.get("dryRun");
  if (dryRun !== null && dryRun !== "1")
    return Response.json(
      { error: "Invalid maintenance options." },
      { status: 400, headers },
    );
  const connection = process.env.DATABASE_URL;
  if (!connection || (!dryRun && !process.env.AWS_ENDPOINT_URL_S3))
    return Response.json(
      { error: "Maintenance is unavailable." },
      { status: 503, headers },
    );
  const sql = postgres(connection, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    ssl: new URL(connection).hostname === "127.0.0.1" ? false : "require",
  });
  try {
    const result = await cleanupTemporaryData(
      sql,
      async (Bucket, Key, abortSignal) => {
        await storage().send(new DeleteObjectCommand({ Bucket, Key }), {
          abortSignal,
        });
      },
      {
        apply: dryRun !== "1",
        originalsBucket: originalsBucket(),
        displayBucket: displayBucket(),
        variantKeys: (key) =>
          photoVariantWidths.map((width) => photoVariantKey(key, width)),
      },
    );
    const summary = {
      mode: result.mode,
      overlap: result.overlap,
      deferred: result.deferred,
      exports: {
        examined: result.exports.examined,
        cleaned: result.exports.cleaned,
        failed: result.exports.failed,
      },
      staging: {
        examined: result.staging.examined,
        cleaned: result.staging.cleaned,
        failed: result.staging.failed,
      },
    };
    console.info("Garden temporary maintenance", JSON.stringify(summary));
    return Response.json(summary, {
      status: result.exports.failed || result.staging.failed ? 503 : 200,
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
export async function HEAD() {
  return new Response(null, { status: 405, headers });
}
