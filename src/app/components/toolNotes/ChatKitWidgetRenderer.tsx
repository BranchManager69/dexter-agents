import Image from "next/image";
import React from "react";

type ThemeColor = { light: string; dark: string };
type Alignment = "start" | "center" | "end" | "stretch";
type Justification = "start" | "center" | "end" | "between" | "around" | "evenly";
type Spacing = number | string;
type BorderStyle = "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "inset" | "outset";

type ActionConfig = { type: string; payload?: Record<string, unknown> };

type BlockProps = {
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  aspectRatio?: number | string;
  radius?: number | string;
  margin?: Spacing;
};

type BorderConfig =
  | number
  | {
      size: number;
      color?: string | ThemeColor;
      style?: BorderStyle;
    };

type BoxBaseProps = {
  children?: WidgetComponent[];
  align?: Alignment;
  justify?: Justification;
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  flex?: number | string;
  gap?: Spacing;
  padding?: Spacing;
  border?: BorderConfig;
  background?: string | ThemeColor;
} & BlockProps;

type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
type TitleSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type CaptionSize = "xs" | "sm" | "md";
type ControlVariant = "solid" | "outline" | "ghost";
type ControlSize = "xs" | "sm" | "md" | "lg";

export type ChatKitWidgetRoot = Card | ListView | BasicRoot;

export type ChatKitWidget = ChatKitWidgetRoot | ChatKitWidgetRoot[];

type BasicRoot = {
  type: "Basic";
  id?: string;
  children: (WidgetComponent | ChatKitWidgetRoot)[];
  theme?: "light" | "dark";
  direction?: "row" | "col";
} & Pick<BoxBaseProps, "gap" | "padding" | "align" | "justify">;

type Card = {
  type: "Card";
  id?: string;
  children: WidgetComponent[];
  background?: string | ThemeColor;
  size?: "sm" | "md" | "lg" | "full";
  padding?: Spacing;
  theme?: "light" | "dark";
} & Pick<BoxBaseProps, "gap" | "align" | "justify">;

type ListView = {
  type: "ListView";
  id?: string;
  children: ListViewItem[];
  limit?: number | "auto";
  theme?: "light" | "dark";
};

type ListViewItem = {
  type: "ListViewItem";
  id?: string;
  children: WidgetComponent[];
  onClickAction?: ActionConfig;
  gap?: Spacing;
  align?: Alignment;
};

type Box = {
  type: "Box";
  id?: string;
} & BoxBaseProps;

type Row = {
  type: "Row";
  id?: string;
} & BoxBaseProps;

type Col = {
  type: "Col";
  id?: string;
} & BoxBaseProps;

type Title = {
  type: "Title";
  id?: string;
  value: string;
  size?: TitleSize;
  color?: string | ThemeColor;
  weight?: "normal" | "medium" | "semibold" | "bold";
  textAlign?: "left" | "center" | "right";
};

type Caption = {
  type: "Caption";
  id?: string;
  value: string;
  size?: CaptionSize;
  color?: string | ThemeColor;
  weight?: "normal" | "medium" | "semibold" | "bold";
  textAlign?: "left" | "center" | "right";
};

type TextComponent = {
  type: "Text";
  id?: string;
  value: string;
  italic?: boolean;
  weight?: "normal" | "medium" | "semibold" | "bold";
  color?: string | ThemeColor;
  size?: TextSize;
  textAlign?: "left" | "center" | "right";
};

type Badge = {
  type: "Badge";
  id?: string;
  label: string;
  color?: "secondary" | "success" | "danger" | "warning" | "info" | "discovery";
  variant?: "solid" | "soft" | "outline";
  size?: "sm" | "md" | "lg";
  pill?: boolean;
};

type Markdown = {
  type: "Markdown";
  id?: string;
  value: string;
};

type Icon = {
  type: "Icon";
  id?: string;
  name: string;
};

type ImageComponent = {
  type: "Image";
  id?: string;
  src: string;
  alt?: string;
  fit?: "cover" | "contain" | "fill" | "scale-down" | "none";
  position?: "top" | "center" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right";
} & BlockProps;

type Button = {
  type: "Button";
  id?: string;
  label?: string;
  onClickAction?: ActionConfig;
  style?: "primary" | "secondary";
  variant?: ControlVariant;
  size?: ControlSize;
  disabled?: boolean;
};

type Divider = {
  type: "Divider";
  id?: string;
  color?: string | ThemeColor;
  size?: number | string;
  spacing?: number | string;
};

type Spacer = {
  type: "Spacer";
  id?: string;
  minSize?: number | string;
};

export type WidgetComponent =
  | Title
  | TextComponent
  | Caption
  | Badge
  | Markdown
  | Icon
  | ImageComponent
  | Button
  | Divider
  | Spacer
  | Box
  | Row
  | Col;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toCss(value?: number | string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return value;
}

function resolveThemeColor(color?: string | ThemeColor): string | undefined {
  if (!color) return undefined;
  if (typeof color === "string") return color;
  return color.dark ?? color.light;
}

const alignMap: Record<Alignment, React.CSSProperties["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

const justifyMap: Record<Justification, React.CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

const badgeColorMap: Record<NonNullable<Badge["color"]>, string> = {
  secondary: "bg-neutral-800/60 text-neutral-200 border-neutral-700",
  success: "bg-emerald-500/10 text-emerald-200 border-emerald-500/40",
  danger: "bg-rose-500/10 text-rose-200 border-rose-500/40",
  warning: "bg-amber-500/10 text-amber-200 border-amber-500/40",
  info: "bg-sky-500/10 text-sky-200 border-sky-500/40",
  discovery: "bg-violet-500/10 text-violet-200 border-violet-500/40",
};

const badgeVariantMap: Record<NonNullable<Badge["variant"]>, string> = {
  solid: "",
  soft: "bg-neutral-800/70",
  outline: "bg-transparent",
};

const textSizeMap: Record<TextSize, string> = {
  xs: "text-[11px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const titleSizeMap: Record<TitleSize, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
  "2xl": "text-3xl",
};

const captionSizeMap: Record<CaptionSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
};

function linkFromAction(action?: ActionConfig): string | undefined {
  if (!action) return undefined;
  if (action.type === "open_url" && typeof action.payload?.url === "string") {
    return action.payload.url;
  }
  if (action.type === "url" && typeof action.payload?.href === "string") {
    return action.payload.href;
  }
  return undefined;
}

function applyBoxStyles(node: {
  align?: Alignment;
  justify?: Justification;
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flex?: number | string;
  gap?: Spacing;
  padding?: Spacing;
  border?: BorderConfig;
  background?: string | ThemeColor;
} & BlockProps): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (node.gap !== undefined) style.gap = toCss(node.gap);
  if (node.padding !== undefined) style.padding = toCss(node.padding);
  if (node.background) style.background = resolveThemeColor(node.background);
  if (node.width !== undefined) style.width = toCss(node.width);
  if (node.height !== undefined) style.height = toCss(node.height);
  if (node.minWidth !== undefined) style.minWidth = toCss(node.minWidth);
  if (node.minHeight !== undefined) style.minHeight = toCss(node.minHeight);
  if (node.maxWidth !== undefined) style.maxWidth = toCss(node.maxWidth);
  if (node.maxHeight !== undefined) style.maxHeight = toCss(node.maxHeight);
  if (node.margin !== undefined) style.margin = toCss(node.margin);
  if (node.aspectRatio !== undefined) style.aspectRatio = typeof node.aspectRatio === "number" ? `${node.aspectRatio}` : node.aspectRatio;
  if (node.radius !== undefined) style.borderRadius = toCss(node.radius);

  if (node.border !== undefined) {
    if (typeof node.border === "number") {
      style.border = `${node.border}px solid rgba(255,255,255,0.08)`;
    } else {
      style.border = `${node.border.size}px ${node.border.style ?? "solid"} ${resolveThemeColor(node.border.color) ?? "rgba(255,255,255,0.12)"}`;
    }
  }

  if (node.flex !== undefined) style.flex = typeof node.flex === "number" ? String(node.flex) : node.flex;

  return style;
}

function renderBadge(component: Badge) {
  const color = component.color ? badgeColorMap[component.color] : "bg-neutral-900/60 text-neutral-200 border-neutral-700";
  const variant = component.variant ? badgeVariantMap[component.variant] : "";
  const sizeClass = component.size === "lg" ? "text-sm px-3 py-1.5" : component.size === "sm" ? "text-[10px] px-2 py-[2px]" : "text-xs px-2.5 py-1";
  return (
    <span
      key={component.id}
      className={cx(
        "inline-flex items-center gap-1 rounded-full border",
        color,
        variant,
        sizeClass,
        component.pill && "rounded-full"
      )}
    >
      {component.label}
    </span>
  );
}

function renderText(component: TextComponent | Caption | Title) {
  const weight = component.weight === "semibold" ? "font-semibold" : component.weight === "bold" ? "font-bold" : component.weight === "medium" ? "font-medium" : "";
  const color = resolveThemeColor(component.color) ?? "inherit";
  const style: React.CSSProperties = { color };
  const align = component.textAlign ? `text-${component.textAlign}` : "";

  if (component.type === "Title") {
    const size = titleSizeMap[component.size ?? "md"];
    return (
      <h3 key={component.id} className={cx("leading-tight text-[#FFF6EC]", size, weight, align)} style={style}>
        {component.value}
      </h3>
    );
  }

  if (component.type === "Caption") {
    const size = captionSizeMap[component.size ?? "sm"];
    return (
      <p key={component.id} className={cx("text-[#F9D9C3]", size, weight, align)} style={style}>
        {component.value}
      </p>
    );
  }

  const size = component.size ? textSizeMap[component.size] : "text-sm";
  return (
    <p
      key={component.id}
      className={cx("text-[#FFE4CF]", size, weight, align, component.italic && "italic")}
      style={style}
    >
      {component.value}
    </p>
  );
}

function renderButton(component: Button) {
  const actionHref = linkFromAction(component.onClickAction);
  const baseClass = cx(
    "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] transition",
    component.style === "primary"
      ? "border-flux/60 bg-flux/10 text-flux hover:bg-flux/20"
      : "border-[#F7BE8A]/30 bg-transparent text-[#FFE4CF] hover:border-flux/40 hover:text-flux",
    component.variant === "ghost" && "border-transparent bg-transparent",
  );

  if (actionHref) {
    return (
      <a
        key={component.id}
        href={actionHref}
        target="_blank"
        rel="noreferrer"
        className={baseClass}
      >
        {component.label ?? "Open"}
      </a>
    );
  }

  return (
    <button key={component.id} type="button" className={baseClass} disabled={component.disabled}>
      {component.label ?? "Action"}
    </button>
  );
}

function renderImage(component: ImageComponent) {
  const style = applyBoxStyles(component);
  const objectFit = component.fit ?? "cover";
  const content = (
    <Image
      src={component.src}
      alt={component.alt ?? ""}
      fill
      sizes="120px"
      className={cx(
        "object-cover",
        objectFit === "contain" && "object-contain",
        objectFit === "fill" && "object-fill",
        objectFit === "scale-down" && "object-scale-down",
        objectFit === "none" && "object-none"
      )}
    />
  );

  return (
    <div key={component.id}
      className="relative overflow-hidden rounded-lg border border-[#F7BE8A]/18 bg-neutral-900/70"
      style={{ ...style, position: "relative", minHeight: style.height ?? "80px" }}
    >
      {content}
    </div>
  );
}

function renderDivider(component: Divider) {
  const color = resolveThemeColor(component.color) ?? "rgba(255,255,255,0.1)";
  const style: React.CSSProperties = {
    borderColor: color,
  };
  if (component.spacing !== undefined) {
    style.margin = toCss(component.spacing);
  }
  if (component.size !== undefined) {
    style.borderWidth = toCss(component.size);
  }
  return <hr key={component.id} className="border-t" style={style} />;
}

function renderSpacer(component: Spacer) {
  return <div key={component.id} style={{ minHeight: toCss(component.minSize) ?? "12px" }} />;
}

function renderBoxLike(component: Box | Row | Col, keyPrefix: string) {
  const direction = component.type === "Row"
    ? "row"
    : component.type === "Col"
      ? "column"
      : ((component as any).direction === "row" || (component as any).direction === "column")
        ? ((component as any).direction as string)
        : "column";
  const style = applyBoxStyles(component);
  if (component.align) style.alignItems = alignMap[component.align];
  if (component.justify) style.justifyContent = justifyMap[component.justify];
  const className = cx(
    "flex",
    direction === "row" ? "flex-row" : "flex-col",
    component.wrap === "wrap" && "flex-wrap",
    component.wrap === "wrap-reverse" && "flex-wrap-reverse",
  );

  return (
    <div key={component.id ?? keyPrefix} className={className} style={style}>
      {renderChildren(component.children ?? [], keyPrefix)}
    </div>
  );
}

function renderComponent(component: WidgetComponent, keyPrefix: string): React.ReactNode {
  switch (component.type) {
    case "Title":
    case "Caption":
    case "Text":
      return renderText(component as Title | Caption | TextComponent);
    case "Badge":
      return renderBadge(component);
    case "Markdown":
      return (
        <div
          key={component.id}
          className="prose prose-invert max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: component.value }}
        />
      );
    case "Icon":
      return (
        <span key={component.id} className="text-neutral-400">
          {component.name}
        </span>
      );
    case "Image":
      return renderImage(component);
    case "Button":
      return renderButton(component);
    case "Divider":
      return renderDivider(component);
    case "Spacer":
      return renderSpacer(component);
    case "Row":
    case "Col":
    case "Box":
      return renderBoxLike(component, keyPrefix);
    default:
      return null;
  }
}

function renderChildren(children: (WidgetComponent | ChatKitWidgetRoot)[], keyPrefix: string) {
  return children.map((child, index) => {
    const key = `${keyPrefix}-${index}`;
    if ((child as ChatKitWidgetRoot).type === "Card" || (child as ChatKitWidgetRoot).type === "ListView" || (child as ChatKitWidgetRoot).type === "Basic") {
      return renderRoot(child as ChatKitWidgetRoot, key);
    }
    return renderComponent(child as WidgetComponent, key);
  });
}

function renderCard(card: Card, keyPrefix: string) {
  const style = applyBoxStyles(card);
  const sizeClass =
    card.size === "sm"
      ? "p-3"
      : card.size === "lg"
        ? "p-6"
        : card.size === "full"
          ? "p-6"
          : "p-4";
  return (
    <div
      key={card.id ?? keyPrefix}
      className={cx(
        "rounded-2xl border border-[#F7BE8A]/18 bg-[#1A090D]/70 shadow-[0_8px_32px_rgba(14,5,3,0.42)]",
        sizeClass
      )}
      style={style}
    >
      <div className="flex flex-col gap-3">{renderChildren(card.children, `${keyPrefix}-card`)}</div>
    </div>
  );
}

function renderListView(list: ListView, keyPrefix: string) {
  const limit = typeof list.limit === "number" ? list.limit : undefined;
  const items = limit ? list.children.slice(0, limit) : list.children;
  return (
    <div key={list.id ?? keyPrefix} className="flex flex-col gap-3">
      {items.map((item, index) => {
        const key = item.id ?? `${keyPrefix}-item-${index}`;
        const style: React.CSSProperties = {};
        if (item.gap !== undefined) style.gap = toCss(item.gap);
        if (item.align) style.alignItems = alignMap[item.align];
        const href = linkFromAction(item.onClickAction);
        const body = (
          <div className="flex flex-col gap-2" style={style}>
            {renderChildren(item.children, `${keyPrefix}-item-${index}`)}
          </div>
        );
        const wrapperClass = "rounded-xl border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 transition hover:border-flux/40";
        if (href) {
          return (
            <a key={key} href={href} target="_blank" rel="noreferrer" className={wrapperClass}>
              {body}
            </a>
          );
        }
        return (
          <div key={key} className={wrapperClass}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

function renderBasic(root: BasicRoot, keyPrefix: string) {
  const style = applyBoxStyles(root);
  const direction = root.direction ?? "column";
  return (
    <div
      key={root.id ?? keyPrefix}
      className={cx("flex", direction === "row" ? "flex-row" : "flex-col")}
      style={style}
    >
      {renderChildren(root.children as (WidgetComponent | ChatKitWidgetRoot)[], `${keyPrefix}-basic`)}
    </div>
  );
}

function renderRoot(node: ChatKitWidgetRoot, keyPrefix: string): React.ReactNode {
  switch (node.type) {
    case "Card":
      return renderCard(node, keyPrefix);
    case "ListView":
      return renderListView(node, keyPrefix);
    case "Basic":
      return renderBasic(node, keyPrefix);
    default:
      return null;
  }
}

export function isChatKitWidgetPayload(value: unknown): value is ChatKitWidget {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === "object" && entry !== null && "type" in entry);
  }
  return typeof value === "object" && "type" in (value as any);
}

export function ChatKitWidgetRenderer({ widgets }: { widgets: ChatKitWidget }) {
  const nodes = Array.isArray(widgets) ? widgets : [widgets];
  return (
    <div className="flex flex-col gap-4">
      {nodes.map((node, index) => renderRoot(node, `widget-${index}`))}
    </div>
  );
}

export type {
  Card,
  ListView,
  ListViewItem,
  Title,
  TextComponent,
  Caption,
  Badge,
  Button,
  ImageComponent,
  Box,
  Row,
  Col,
  BasicRoot,
  ActionConfig,
};

export type { WidgetComponent as ChatKitWidgetComponent };
