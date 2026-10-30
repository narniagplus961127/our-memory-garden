import { PhotoPicker } from "./media-library";
import { PageGrid, PageGridSettings } from "./page-grid";
import type { GridSelection, PageCard } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";
import { DestinationPicker } from "./destination-picker";
import { destinationHref, type Destination } from "@/lib/destinations";
import type { Config, Slot } from "@puckeditor/core";
import type { TextStyle } from "@/lib/pages";
export type GardenBlocks = {
  PageGrid: {
    selection: GridSelection;
    showDate?: boolean;
    cards?: PageCard[];
  };
  Text: {
    text: string;
    style: TextStyle;
    align?: "left" | "center";
    linkText?: string;
    destination?: Destination | null;
  };
  Banner: {
    heading: string;
    description: string;
    background?: "paper" | "sage" | "clay";
    align?: "left" | "center";
  };
  Image: {
    photoId?: string;
    alt: string;
    caption?: string;
    fit?: "cover" | "contain";
    width?: "inset" | "full";
  };
  Button: {
    label: string;
    href?: string;
    destination?: Destination | null;
    variant?: "primary" | "secondary";
    align?: "left" | "center";
  };
  Section: {
    background?: "paper" | "sage" | "clay";
    spacing?: "compact" | "comfortable" | "spacious";
    content: Slot;
  };
  Columns: {
    ratio?: "equal" | "wide-left" | "wide-right";
    gap?: "compact" | "comfortable" | "spacious";
    left: Slot;
    right: Slot;
  };
};
const alignment = {
  type: "select" as const,
  label: "Alignment",
  options: [
    { label: "Left", value: "left" },
    { label: "Centre", value: "center" },
  ],
};
const backgrounds = {
  type: "select" as const,
  label: "Background",
  options: [
    { label: "Paper", value: "paper" },
    { label: "Sage", value: "sage" },
    { label: "Clay", value: "clay" },
  ],
};
const spacing = {
  type: "select" as const,
  label: "Spacing",
  options: [
    { label: "Compact", value: "compact" },
    { label: "Comfortable", value: "comfortable" },
    { label: "Spacious", value: "spacious" },
  ],
};
export const gardenConfig: Config<GardenBlocks> = {
  root: {
    render: ({ children }) => <div className="garden-document">{children}</div>,
  },
  components: {
    PageGrid: {
      label: "Page grid",
      fields: {
        selection: {
          type: "custom",
          label: "Pages",
          render: ({ value, onChange }) => (
            <PageGridSettings value={value} onChange={onChange} />
          ),
        },
        showDate: {
          type: "radio",
          label: "Show page dates",
          options: [
            { label: "Show", value: true },
            { label: "Hide", value: false },
          ],
        },
      },
      defaultProps: {
        selection: { mode: "manual", pageIds: [], categoryId: "" },
        showDate: true,
      },
      render: ({ selection, showDate, cards }) => (
        <PageGrid selection={selection} showDate={showDate} cards={cards} />
      ),
    },
    Text: {
      label: "Text",
      fields: {
        text: { type: "textarea", label: "Text content" },
        style: {
          type: "select",
          label: "Text style",
          options: ["h1", "h2", "h3", "h4", "p", "small"].map((value) => ({
            label:
              value === "p"
                ? "Paragraph"
                : value === "small"
                  ? "Small"
                  : value.toUpperCase(),
            value,
          })),
        },
        align: alignment,
        linkText: { type: "text", label: "Linked text" },
        destination: {
          type: "custom",
          render: ({ value, onChange }) => (
            <DestinationPicker value={value} onChange={onChange} optional />
          ),
        },
      },
      defaultProps: {
        text: "Write a little memory…",
        style: "p",
        align: "left",
      },
      render: ({ text, style, align, linkText, destination }) => {
        const href = destinationHref(destination ?? undefined);
        const start = linkText ? text.indexOf(linkText) : -1;
        const Tag = style;
        return (
          <div
            className="garden-block garden-text"
            style={{ textAlign: align }}
          >
            <Tag className="text-block">
              {href && linkText && start >= 0 ? (
                <>
                  {text.slice(0, start)}
                  <a href={href}>{linkText}</a>
                  {text.slice(start + linkText.length)}
                </>
              ) : (
                text
              )}
            </Tag>
          </div>
        );
      },
    },
    Banner: {
      label: "Banner",
      fields: {
        heading: { type: "text", label: "Heading" },
        description: { type: "textarea", label: "Description" },
        background: backgrounds,
        align: alignment,
      },
      defaultProps: {
        heading: "A little moment, remembered",
        description: "Tell the story behind it.",
        background: "sage",
        align: "left",
      },
      render: ({ heading, description, background, align }) => (
        <header
          className={"garden-banner garden-tone-" + (background ?? "sage")}
          style={{ textAlign: align }}
        >
          <p className="eyebrow">Our memory garden</p>
          <h1>{heading}</h1>
          <p>{description}</p>
        </header>
      ),
    },
    Image: {
      label: "Image",
      fields: {
        photoId: {
          type: "custom",
          label: "Photo",
          render: ({ value, onChange }) => (
            <PhotoPicker value={value} onChange={onChange} />
          ),
        },
        alt: { type: "text", label: "Alternative text" },
        caption: { type: "textarea", label: "Caption" },
        fit: {
          type: "select",
          label: "Photo fit",
          options: [
            { label: "Cover", value: "cover" },
            { label: "Contain", value: "contain" },
          ],
        },
        width: {
          type: "select",
          label: "Photo width",
          options: [
            { label: "Inset", value: "inset" },
            { label: "Full width", value: "full" },
          ],
        },
      },
      defaultProps: {
        alt: "A photograph from our garden",
        caption: "",
        fit: "cover",
        width: "inset",
      },
      render: ({ photoId, alt, caption, fit, width }) => (
        <figure className={"garden-image garden-image-" + (width ?? "inset")}>
          {photoId ? (
            <img
              className={"garden-photo garden-fit-" + (fit ?? "cover")}
              src={displayPhotoUrl(photoId)}
              alt={alt}
            />
          ) : (
            <div
              role="img"
              aria-label={alt || "Photo placeholder"}
              className={
                "garden-photo-placeholder garden-fit-" + (fit ?? "cover")
              }
            >
              <svg viewBox="0 0 200 150" aria-hidden="true">
                <path
                  d="M100 140V60M100 100C40 100 35 55 35 55c50-5 65 45 65 45ZM100 80c55 0 65-50 65-50-50-5-65 50-65 50ZM100 60C60 40 85 10 85 10s35 20 15 50Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <span>Photo placeholder</span>
            </div>
          )}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      ),
    },
    Button: {
      label: "Button",
      fields: {
        label: { type: "text", label: "Button label" },
        destination: {
          type: "custom",
          render: ({ value, onChange }) => (
            <DestinationPicker
              value={value ?? { kind: "external", url: "https://example.com" }}
              onChange={onChange}
            />
          ),
        },
        variant: {
          type: "select",
          label: "Appearance",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
        },
        align: alignment,
      },
      resolveFields: (data, { fields }) => ({
        ...fields,
        destination: {
          type: "custom",
          render: ({ value, onChange }) => (
            <DestinationPicker
              value={value ?? { kind: "external", url: data.props.href ?? "" }}
              onChange={onChange}
            />
          ),
        },
      }),
      defaultProps: {
        label: "Explore a little more",
        href: "https://example.com",
        variant: "primary",
        align: "left",
      },
      render: ({ label, href, destination, variant, align }) => (
        <div
          className="garden-block garden-button-block"
          style={{ textAlign: align }}
        >
          <a
            className={"button " + (variant ?? "primary")}
            href={destinationHref(destination ?? undefined, href)}
          >
            {label}
          </a>
        </div>
      ),
    },
    Section: {
      label: "Section",
      fields: { background: backgrounds, spacing, content: { type: "slot" } },
      defaultProps: {
        background: "paper",
        spacing: "comfortable",
        content: [],
      },
      render: ({ background, spacing: space, content: Content }) => (
        <section
          className={
            "garden-section garden-tone-" +
            (background ?? "paper") +
            " garden-space-" +
            (space ?? "comfortable")
          }
        >
          <Content minEmptyHeight={100} />
        </section>
      ),
    },
    Columns: {
      label: "Columns",
      fields: {
        ratio: {
          type: "select",
          label: "Column proportions",
          options: [
            { label: "Equal", value: "equal" },
            { label: "Two to one", value: "wide-left" },
            { label: "One to two", value: "wide-right" },
          ],
        },
        gap: spacing,
        left: { type: "slot" },
        right: { type: "slot" },
      },
      defaultProps: { ratio: "equal", gap: "comfortable", left: [], right: [] },
      render: ({ ratio, gap, left: Left, right: Right }) => (
        <div
          className={
            "garden-columns garden-columns-" +
            (ratio ?? "equal") +
            " garden-gap-" +
            (gap ?? "comfortable")
          }
        >
          <div>
            <Left minEmptyHeight={120} />
          </div>
          <div>
            <Right minEmptyHeight={120} />
          </div>
        </div>
      ),
    },
  },
};
