import { Button } from "@/components/ui/button";
import { GallerySettings } from "./gallery-settings";
import { PhotoGallery, type GalleryPhoto } from "./photo-gallery";
import { PhotoPicker } from "./media-library";
import { PageGrid, PageGridSettings } from "./page-grid";
import type { GridSelection, PageCard } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";
import { DestinationPicker } from "./destination-picker";
import { ButtonDestination } from "./button-destination";
import { ButtonRadiusControl } from "./button-radius";
import { AnimatedBlock } from "./animated-block";
import { AnimationSettings } from "./animation-settings";
import { destinationHref, type Destination } from "@/lib/destinations";
import { BackgroundColour } from "./background-colour";
import { BlockSpacingControl, type BlockSpacing } from "./block-spacing";
import { richField } from "./garden-rich-field";
import { CanvasPhotoAction } from "./canvas-photo-action";
import { PhotoControls } from "./editor-photo-controls";
import { PhotoImage } from "./photo-image";
import { CanvasRichText } from "./canvas-rich-text";
import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  SectionContentBackground,
  SectionColumnAlignment,
  SectionWidth,
  type ContentBackground,
} from "./section-settings";
import type { Config, Slot, RichText, PuckContext } from "@puckeditor/core";
import type { TextStyle } from "@/lib/pages";
type Appearance = {
  animation?: "none" | "fade-in";
  backgroundColor?: string;
  padding?: number;
  paddingSides?: BlockSpacing;
  marginSides?: BlockSpacing;
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
    align?: "left" | "center" | "right";
    linkText?: string;
    destination?: Destination | null;
  };
  Banner: {
    heading: string;
    headingRich?: RichText;
    descriptionRich?: RichText;
    description: string;
    background?: "paper" | "sage" | "clay";
    align?: "left" | "center" | "right";
  };
  Image: {
    destination?: Destination | null;
    photoId?: string;
    alt: string;
    caption?: string;
    captionRich?: RichText;
    fit?: "cover" | "contain";
    width?: "inset" | "full";
  };
  Gallery: {
    photos: GalleryPhoto[];
  };
  Button: {
    label: string;
    labelRich?: RichText;
    href?: string;
    destination?: Destination | null;
    variant?: "primary" | "secondary";
    align?: "left" | "center" | "right";
    width?: "fit" | "full";
    buttonColor?: string;
    textColor?: string;
    buttonPadding?: BlockSpacing;
    buttonRadius?: number;
  };
  Section: {
    width?: "container" | "full";
    background?: "paper" | "sage" | "clay";
    spacing?: "compact" | "comfortable" | "spacious";
    content: Slot;
    backgroundImage?: {
      photoId: string;
    };
    contentBackground?: ContentBackground;
    borderWidth?: number;
    borderColor?: string;
    columnAlignment?: "top" | "center" | "bottom";
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
    paddingTop: value.paddingSides?.top ?? value.padding,
    paddingRight: value.paddingSides?.right ?? value.padding,
    paddingBottom: value.paddingSides?.bottom ?? value.padding,
    paddingLeft: value.paddingSides?.left ?? value.padding,
    marginTop: value.marginSides?.top,
    marginRight: value.marginSides?.right,
    marginBottom: value.marginSides?.bottom,
    marginLeft: value.marginSides?.left,
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
function ImageLink({
  children,
  destination,
  editing,
  alt,
}: {
  children: ReactNode;
  destination?: Destination | null;
  editing: boolean;
  alt: string;
}) {
  const href = destinationHref(destination ?? undefined);
  return href && !editing ? (
    <a
      className="garden-image-link"
      href={href}
      aria-label={alt || "Open image link"}
    >
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}
const appearance = {
  animation: {
    type: "custom" as const,
    label: "Animation",
    render: ({
      value,
      onChange,
    }: {
      value?: "none" | "fade-in";
      onChange: (value: "none" | "fade-in") => void;
    }) => <AnimationSettings value={value} onChange={onChange} />,
  },
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
    label: "All sides padding · px",
    min: 0,
    max: 120,
    step: 1,
    visible: false,
  },
  paddingSides: {
    type: "custom" as const,
    label: "Padding",
    render: ({
      value,
      onChange,
    }: {
      value?: BlockSpacing;
      onChange: (value: BlockSpacing) => void;
    }) => (
      <BlockSpacingControl label="Padding" value={value} onChange={onChange} />
    ),
  },
  marginSides: {
    type: "custom" as const,
    label: "Margin",
    render: ({
      value,
      onChange,
    }: {
      value?: BlockSpacing;
      onChange: (value: BlockSpacing) => void;
    }) => (
      <BlockSpacingControl label="Margin" value={value} onChange={onChange} />
    ),
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
    { label: "Right", value: "right" },
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
export const gardenConfig: Config<
  GardenBlocks,
  {
    showTitle?: boolean;
  }
> = {
  root: {
    fields: {
      showTitle: {
        type: "radio",
        visible: false,
        label: "Show page title",
        options: [
          { label: "Show", value: true },
          { label: "Hide", value: false },
        ],
      },
    },
    render: ({ children, puck }) => (
      <div className="garden-document">
        {/* Puck supplies its root drop area as children. Restrict that existing area;
                    nested content uses Slot allow lists, without adding deprecated DropZones. */}
        {puck.isEditing &&
        isValidElement<{
          allow?: string[];
        }>(children)
          ? cloneElement(children, { allow: ["Section"] })
          : children}
      </div>
    ),
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
      render: ({ selection, showDate, cards, puck, ...surface }) => (
        <AnimatedBlock
          animation={surface.animation}
          editing={puck.isEditing}
          style={blockStyle(surface)}
        >
          <PageGrid selection={selection} showDate={showDate} cards={cards} />
        </AnimatedBlock>
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
          <AnimatedBlock
            animation={surface.animation}
            editing={puck.isEditing}
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
          </AnimatedBlock>
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
        <AnimatedBlock
          as="header"
          animation={surface.animation}
          editing={puck.isEditing}
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
        </AnimatedBlock>
      ),
    },
    Image: {
      label: "Image",
      fields: {
        ...appearance,
        destination: {
          type: "custom",
          label: "Image link",
          render: ({ value, onChange }) => (
            <DestinationPicker value={value} onChange={onChange} optional />
          ),
        },
        photoId: {
          type: "custom",
          label: "Photo",
          render: ({ value, onChange }) => (
            <PhotoControls field>
              <PhotoPicker value={value} onChange={onChange} inModal />
            </PhotoControls>
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
        destination,
        alt,
        caption,
        captionRich,
        fit,
        width,
        puck,
        ...surface
      }) => (
        <AnimatedBlock
          as="figure"
          animation={surface.animation}
          editing={puck.isEditing}
          className={"garden-image garden-image-" + (width ?? "inset")}
          style={blockStyle(surface)}
        >
          <ImageLink
            destination={destination}
            editing={puck.isEditing}
            alt={alt}
          >
            {photoId ? (
              <PhotoImage
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
          </ImageLink>
          {puck.isEditing && (
            <PhotoControls>
              <CanvasPhotoAction id={id} hasPhoto={Boolean(photoId)} />
            </PhotoControls>
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
        </AnimatedBlock>
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
      render: ({ photos, puck, ...surface }) => (
        <AnimatedBlock
          animation={surface.animation}
          editing={puck.isEditing}
          style={blockStyle(surface)}
        >
          <PhotoGallery photos={photos} />
        </AnimatedBlock>
      ),
    },
    Button: {
      label: "Button",
      fields: {
        label: { type: "text", label: "Button label", visible: false },
        labelRich: richField("Button label"),
        destination: {
          type: "custom",
          render: ({ value, onChange }) => (
            <ButtonDestination value={value} onChange={onChange} />
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
        width: {
          type: "custom",
          label: "Button width",
          render: ({ value, onChange }) => (
            <fieldset className="button-width-control">
              <legend>Button width</legend>
              <div>
                {(
                  [
                    ["fit", "Fit content"],
                    ["full", "Full width"],
                  ] as const
                ).map(([width, label]) => (
                  <Button
                    type="button"
                    key={width}
                    aria-pressed={(value ?? "fit") === width}
                    onClick={() => onChange(width)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
          ),
        },
        buttonColor: {
          type: "custom",
          label: "Button background",
          render: ({ value, onChange }) => (
            <BackgroundColour
              value={value}
              onChange={onChange}
              label="Button background"
              defaultLabel="Default"
            />
          ),
        },
        textColor: {
          type: "custom",
          label: "Button text colour",
          render: ({ value, onChange }) => (
            <BackgroundColour
              value={value}
              onChange={onChange}
              label="Button text colour"
              defaultLabel="Default"
            />
          ),
        },
        buttonPadding: {
          type: "custom",
          label: "Button padding",
          render: ({ value, onChange }) => (
            <BlockSpacingControl
              label="Button padding"
              description="Space between the button label and its edge."
              value={value}
              onChange={onChange}
            />
          ),
        },
        buttonRadius: {
          type: "custom",
          label: "Button corner radius",
          render: ({ value, onChange }) => (
            <ButtonRadiusControl value={value} onChange={onChange} />
          ),
        },
        align: alignment,
        ...appearance,
      },
      defaultProps: {
        label: "Explore a little more",
        labelRich: "<p>Explore a little more</p>",
        href: "",
        variant: "primary",
        width: "fit",
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
        width,
        buttonColor,
        textColor,
        buttonPadding,
        buttonRadius,
        ...surface
      }) => {
        const target = destinationHref(destination, href);
        const Element = target ? "a" : "span";
        return (
          <AnimatedBlock
            animation={surface.animation}
            editing={puck.isEditing}
            className="garden-block garden-button-block"
            style={{ textAlign: align, ...blockStyle(surface) }}
          >
            <Button asChild className={"button " + (variant ?? "primary")}>
              <Element
                style={{
                  cursor: target ? undefined : "default",
                  width: width === "full" ? "100%" : undefined,
                  backgroundColor: buttonColor || undefined,
                  borderColor: buttonColor || undefined,
                  color: textColor || undefined,
                  paddingTop: buttonPadding?.top,
                  paddingRight: buttonPadding?.right,
                  paddingBottom: buttonPadding?.bottom,
                  paddingLeft: buttonPadding?.left,
                  borderRadius: buttonRadius,
                }}
                href={target}
              >
                <RichContent id={id} puck={puck} type="Button">
                  {labelRich !== undefined ? (
                    <span className="garden-rich-text">{labelRich}</span>
                  ) : (
                    label
                  )}
                </RichContent>
              </Element>
            </Button>
          </AnimatedBlock>
        );
      },
    },
    Section: {
      label: "Section",
      fields: {
        ...appearance,
        width: {
          type: "custom",
          label: "Section width",
          render: ({ value, onChange }) => (
            <SectionWidth value={value} onChange={onChange} />
          ),
        },
        background: backgrounds,
        spacing,
        backgroundImage: {
          type: "custom",
          label: "Background image",
          render: ({ value, onChange }) => (
            <PhotoControls field>
              <PhotoPicker
                label="Background image"
                value={value?.photoId}
                onChange={(photoId) => onChange({ photoId })}
              />
            </PhotoControls>
          ),
        },
        contentBackground: {
          type: "custom",
          label: "Content background",
          render: ({ value, onChange }) => (
            <SectionContentBackground value={value} onChange={onChange} />
          ),
        },
        borderWidth: {
          type: "number",
          label: "Border width · px",
          min: 0,
          max: 12,
          step: 1,
        },
        borderColor: {
          type: "custom",
          label: "Border colour",
          render: ({ value, onChange }) => (
            <BackgroundColour
              label="Border colour"
              defaultLabel="Garden green"
              value={value}
              onChange={onChange}
            />
          ),
        },
        columnAlignment: {
          type: "custom",
          label: "Column content alignment",
          render: ({ value, onChange }) => (
            <SectionColumnAlignment value={value} onChange={onChange} />
          ),
        },
        content: { type: "slot", disallow: ["Section"] },
      },
      defaultProps: {
        width: "container",
        background: "paper",
        spacing: "comfortable",
        content: [],
        columnAlignment: "top",
      },
      render: ({
        width,
        puck,
        background,
        spacing: space,
        content: Content,
        backgroundImage,
        contentBackground,
        borderWidth,
        borderColor,
        columnAlignment,
        ...surface
      }) => (
        <AnimatedBlock
          as="section"
          animation={surface.animation}
          editing={puck.isEditing}
          className={
            "garden-section garden-tone-" +
            (background ?? "paper") +
            " garden-space-" +
            (space ?? "comfortable") +
            (width === "full" ? " garden-section-full" : "")
          }
          style={
            {
              ...blockStyle(surface),
              ...(width === "full"
                ? { paddingLeft: 0, paddingRight: 0, "--gutter": "0px" }
                : {}),
              backgroundImage: backgroundImage?.photoId
                ? `url("${displayPhotoUrl(backgroundImage.photoId)}")`
                : undefined,
              border: borderWidth
                ? `${borderWidth}px solid ${borderColor || "#304337"}`
                : undefined,
              "--section-column-alignment":
                columnAlignment === "center"
                  ? "center"
                  : columnAlignment === "bottom"
                    ? "end"
                    : "start",
            } as CSSProperties
          }
        >
          {/* Slot callbacks change with their content; invoking them keeps child editors mounted. */}
          <div
            className="garden-section-content"
            style={{
              backgroundColor:
                contentBackground?.mode === "auto"
                  ? "var(--paper)"
                  : contentBackground?.mode === "custom"
                    ? contentBackground.colour || "var(--paper)"
                    : undefined,
            }}
          >
            {Content({ minEmptyHeight: 100 })}
          </div>
        </AnimatedBlock>
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
        left: { type: "slot", disallow: ["Section"] },
        right: { type: "slot", disallow: ["Section"] },
        third: { type: "slot", disallow: ["Section"] },
        fourth: { type: "slot", disallow: ["Section"] },
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
        puck,
        ...surface
      }) => (
        <AnimatedBlock
          animation={surface.animation}
          editing={puck.isEditing}
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
          <div>{Left({ minEmptyHeight: 120 })}</div>
          {count > 1 && <div>{Right({ minEmptyHeight: 120 })}</div>}
          {count > 2 && Third && <div>{Third({ minEmptyHeight: 120 })}</div>}
          {count > 3 && Fourth && <div>{Fourth({ minEmptyHeight: 120 })}</div>}
        </AnimatedBlock>
      ),
    },
  },
};
