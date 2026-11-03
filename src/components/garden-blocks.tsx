import { GallerySettings } from "./gallery-settings";
import { PhotoGallery, type GalleryPhoto } from "./photo-gallery";
import { PhotoPicker } from "./media-library";
import { PageGrid, PageGridSettings } from "./page-grid";
import type { GridSelection, PageCard } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";
import { DestinationPicker } from "./destination-picker";
import { destinationHref, type Destination } from "@/lib/destinations";
import { BackgroundColour } from "./background-colour";
import { richField } from "./garden-rich-field";
import { CanvasPhotoAction } from "./canvas-photo-action";
import { CanvasRichText } from "./canvas-rich-text";
import type { CSSProperties, ReactNode } from "react";
import type { Config, Slot, RichText, PuckContext } from "@puckeditor/core";
import type { TextStyle } from "@/lib/pages";
type Appearance = {
  backgroundColor?: string;
  padding?: number;
  radius?: number;
};
type GardenBlockProps = {
  PageGrid: {
    selection: GridSelection;
    showDate?: boolean;
    cards?: PageCard[];
  };
  Text: {
    text: string;
    textRich?: RichText;
    style: TextStyle;
    align?: "left" | "center";
    linkText?: string;
    destination?: Destination | null;
  };
  Banner: {
    heading: string;
    headingRich?: RichText;
    descriptionRich?: RichText;
    description: string;
    background?: "paper" | "sage" | "clay";
    align?: "left" | "center";
  };
  Image: {
    photoId?: string;
    alt: string;
    caption?: string;
    captionRich?: RichText;
    fit?: "cover" | "contain";
    width?: "inset" | "full";
  };
  Gallery: { photos: GalleryPhoto[] };
  Button: {
    label: string;
    labelRich?: RichText;
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
    count?: number;
    ratio?:
      "equal" | "wide-left" | "wide-right" | "quarter-left" | "quarter-right";
    gap?: "compact" | "comfortable" | "spacious";
    left: Slot;
    right: Slot;
    third?: Slot;
    fourth?: Slot;
  };
};
export type GardenBlocks = {
  [K in keyof GardenBlockProps]: GardenBlockProps[K] & Appearance;
};
function blockStyle(value: Appearance): CSSProperties {
  return {
    backgroundColor: value.backgroundColor || undefined,
    padding: value.padding,
    borderRadius: value.radius,
  };
}
function RichContent({
  id,
  puck,
  type,
  children,
}: {
  id: string;
  puck: PuckContext;
  type: string;
  children: ReactNode;
}) {
  return puck.isEditing ? (
    <CanvasRichText id={id} type={type}>
      {children}
    </CanvasRichText>
  ) : (
    children
  );
}
const appearance = {
  backgroundColor: {
    type: "custom" as const,
    label: "Background colour",
    render: ({
      value,
      onChange,
    }: {
      value?: string;
      onChange: (value: string) => void;
    }) => <BackgroundColour value={value} onChange={onChange} />,
  },
  padding: {
    type: "number" as const,
    label: "Block padding · px",
    min: 0,
    max: 120,
    step: 1,
  },
  radius: {
    type: "number" as const,
    label: "Corner radius · px",
    min: 0,
    max: 24,
    step: 1,
  },
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
        ...appearance,
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
      render: ({ selection, showDate, cards, ...surface }) => (
        <div style={blockStyle(surface)}>
          <PageGrid selection={selection} showDate={showDate} cards={cards} />
        </div>
      ),
    },
    Text: {
      label: "Text",
      fields: {
        ...appearance,
        text: { type: "textarea", label: "Text content", visible: false },
        textRich: richField("Text content"),
        style: {
          type: "select",
          label: "Text style",
          visible: false,
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
        linkText: { type: "text", label: "Linked text", visible: false },
        destination: {
          type: "custom",
          visible: false,
          render: ({ value, onChange }) => (
            <DestinationPicker value={value} onChange={onChange} optional />
          ),
        },
      },
      defaultProps: {
        text: "Write a little memory…",
        textRich: "<p>Write a little memory…</p>",
        style: "p",
        align: "left",
      },
      render: ({
        id,
        puck,
        text,
        textRich,
        style,
        align,
        linkText,
        destination,
        ...surface
      }) => {
        const href = destinationHref(destination ?? undefined);
        const start = linkText ? text.indexOf(linkText) : -1;
        const Tag = style;
        return (
          <div
            className="garden-block garden-text"
            style={{ textAlign: align, ...blockStyle(surface) }}
          >
            <RichContent id={id} puck={puck} type="Text">
              {textRich !== undefined ? (
                <div className="text-block garden-rich-text">{textRich}</div>
              ) : (
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
              )}
            </RichContent>
          </div>
        );
      },
    },
    Banner: {
      label: "Banner",
      fields: {
        ...appearance,
        heading: { type: "text", label: "Heading", visible: false },
        headingRich: richField("Heading"),
        description: { type: "textarea", label: "Description", visible: false },
        descriptionRich: richField("Description"),
        background: backgrounds,
        align: alignment,
      },
      defaultProps: {
        heading: "A little moment, remembered",
        headingRich: "<h1>A little moment, remembered</h1>",
        descriptionRich: "<p>Tell the story behind it.</p>",
        description: "Tell the story behind it.",
        background: "sage",
        align: "left",
      },
      render: ({
        id,
        puck,
        heading,
        headingRich,
        description,
        descriptionRich,
        background,
        align,
        ...surface
      }) => (
        <header
          className={"garden-banner garden-tone-" + (background ?? "sage")}
          style={{ textAlign: align, ...blockStyle(surface) }}
        >
          <p className="eyebrow">Our memory garden</p>
          <RichContent id={id} puck={puck} type="Banner">
            {headingRich !== undefined ? (
              <div className="garden-rich-text">{headingRich}</div>
            ) : (
              <h1>{heading}</h1>
            )}
            {descriptionRich !== undefined ? (
              <div className="garden-rich-text">{descriptionRich}</div>
            ) : (
              <p>{description}</p>
            )}
          </RichContent>
        </header>
      ),
    },
    Image: {
      label: "Image",
      fields: {
        ...appearance,
        photoId: {
          type: "custom",
          label: "Photo",
          render: ({ value, onChange }) => (
            <PhotoPicker value={value} onChange={onChange} />
          ),
        },
        alt: { type: "text", label: "Alternative text" },
        caption: { type: "textarea", label: "Caption", visible: false },
        captionRich: richField("Caption"),
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
        captionRich: "<p></p>",
        fit: "cover",
        width: "inset",
      },
      render: ({
        id,
        photoId,
        alt,
        caption,
        captionRich,
        fit,
        width,
        puck,
        ...surface
      }) => (
        <figure
          className={"garden-image garden-image-" + (width ?? "inset")}
          style={blockStyle(surface)}
        >
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
          {puck.isEditing && (
            <CanvasPhotoAction id={id} hasPhoto={Boolean(photoId)} />
          )}
          <RichContent id={id} puck={puck} type="Image">
            {captionRich !== undefined ? (
              <figcaption className="garden-rich-text">
                {captionRich}
              </figcaption>
            ) : (
              caption && <figcaption>{caption}</figcaption>
            )}
          </RichContent>
        </figure>
      ),
    },
    Gallery: {
      label: "Gallery",
      fields: {
        ...appearance,
        photos: {
          type: "custom",
          label: "Gallery photos",
          render: ({ value, onChange }) => (
            <GallerySettings value={value} onChange={onChange} />
          ),
        },
      },
      defaultProps: { photos: [] },
      render: ({ photos, ...surface }) => (
        <div style={blockStyle(surface)}>
          <PhotoGallery photos={photos} />
        </div>
      ),
    },
    Button: {
      label: "Button",
      fields: {
        ...appearance,
        label: { type: "text", label: "Button label", visible: false },
        labelRich: richField("Button label"),
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
        labelRich: "<p>Explore a little more</p>",
        href: "https://example.com",
        variant: "primary",
        align: "left",
      },
      render: ({
        id,
        puck,
        label,
        labelRich,
        href,
        destination,
        variant,
        align,
        ...surface
      }) => (
        <div
          className="garden-block garden-button-block"
          style={{ textAlign: align, ...blockStyle(surface) }}
        >
          <a
            className={"button " + (variant ?? "primary")}
            href={destinationHref(destination ?? undefined, href)}
          >
            <RichContent id={id} puck={puck} type="Button">
              {labelRich !== undefined ? (
                <span className="garden-rich-text">{labelRich}</span>
              ) : (
                label
              )}
            </RichContent>
          </a>
        </div>
      ),
    },
    Section: {
      label: "Section",
      fields: {
        ...appearance,
        background: backgrounds,
        spacing,
        content: { type: "slot" },
      },
      defaultProps: {
        background: "paper",
        spacing: "comfortable",
        content: [],
      },
      render: ({
        background,
        spacing: space,
        content: Content,
        ...surface
      }) => (
        <section
          className={
            "garden-section garden-tone-" +
            (background ?? "paper") +
            " garden-space-" +
            (space ?? "comfortable")
          }
          style={blockStyle(surface)}
        >
          <Content minEmptyHeight={100} />
        </section>
      ),
    },
    Columns: {
      label: "Columns",
      fields: {
        ...appearance,
        count: { type: "number", min: 1, max: 4, visible: false },
        ratio: {
          type: "select",
          visible: false,
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
        third: { type: "slot" },
        fourth: { type: "slot" },
      },
      defaultProps: {
        count: 2,
        ratio: "equal",
        gap: "comfortable",
        left: [],
        right: [],
        third: [],
        fourth: [],
      },
      render: ({
        count = 2,
        ratio,
        gap,
        left: Left,
        right: Right,
        third: Third,
        fourth: Fourth,
        ...surface
      }) => (
        <div
          className={
            "garden-columns garden-columns-" +
            (ratio ?? "equal") +
            " garden-gap-" +
            (gap ?? "comfortable") +
            " garden-columns-count-" +
            count
          }
          style={blockStyle(surface)}
        >
          <div>
            <Left minEmptyHeight={120} />
          </div>
          {count > 1 && (
            <div>
              <Right minEmptyHeight={120} />
            </div>
          )}
          {count > 2 && Third && (
            <div>
              <Third minEmptyHeight={120} />
            </div>
          )}
          {count > 3 && Fourth && (
            <div>
              <Fourth minEmptyHeight={120} />
            </div>
          )}
        </div>
      ),
    },
  },
};
