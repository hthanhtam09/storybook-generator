import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export interface ParsedRunStyle {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  colorHex?: string;
}

export interface ParsedParagraphSpacing {
  beforePt?: number;
  afterPt?: number;
  linePt?: number;
}

export interface ParsedParagraphStyle {
  spacing?: ParsedParagraphSpacing;
  alignment?: string;
}

export interface ParsedStyleDefaults {
  run?: ParsedRunStyle;
  paragraph?: ParsedParagraphStyle;
}

export interface ParsedNamedStyle {
  styleId: string;
  name?: string;
  type: "paragraph" | "character" | string;
  run?: ParsedRunStyle;
  paragraph?: ParsedParagraphStyle;
  basedOn?: string;
}

export interface DocxParsedStyles {
  defaults: ParsedStyleDefaults;
  namedStyles: ParsedNamedStyle[];
}

type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

function mergeRunStyle(
  base?: ParsedRunStyle,
  override?: PartialDeep<ParsedRunStyle>
): ParsedRunStyle {
  return {
    fontFamily: override?.fontFamily ?? base?.fontFamily,
    fontSizePt: override?.fontSizePt ?? base?.fontSizePt,
    bold: override?.bold ?? base?.bold,
    italic: override?.italic ?? base?.italic,
    colorHex: override?.colorHex ?? base?.colorHex,
  };
}

function mergeParagraphStyle(
  base?: ParsedParagraphStyle,
  override?: PartialDeep<ParsedParagraphStyle>
): ParsedParagraphStyle {
  return {
    alignment: override?.alignment ?? base?.alignment,
    spacing: {
      beforePt: override?.spacing?.beforePt ?? base?.spacing?.beforePt,
      afterPt: override?.spacing?.afterPt ?? base?.spacing?.afterPt,
      linePt: override?.spacing?.linePt ?? base?.spacing?.linePt,
    },
  };
}

export interface ResolvedDefaults {
  run?: ParsedRunStyle;
  paragraph?: ParsedParagraphStyle;
  normalStyle?: ParsedNamedStyle;
}

export function resolveDefaults(parsed: DocxParsedStyles): ResolvedDefaults {
  const byId = new Map<string, ParsedNamedStyle>();
  for (const s of parsed.namedStyles) {
    if (s?.styleId) byId.set(s.styleId, s);
  }

  const resolveChain = (
    style?: ParsedNamedStyle
  ): ParsedNamedStyle | undefined => {
    if (!style) return undefined;
    const chain: ParsedNamedStyle[] = [];
    let cur: ParsedNamedStyle | undefined = style;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.styleId)) {
      chain.unshift(cur);
      seen.add(cur.styleId);
      if (cur.basedOn && byId.has(cur.basedOn)) {
        cur = byId.get(cur.basedOn);
      } else {
        cur = undefined;
      }
    }
    // fold chain over defaults
    let merged: ParsedNamedStyle | undefined;
    for (const s of chain) {
      merged = {
        styleId: s.styleId,
        name: s.name,
        type: s.type,
        basedOn: s.basedOn,
        run: mergeRunStyle(merged?.run || parsed.defaults.run, s.run),
        paragraph: mergeParagraphStyle(
          merged?.paragraph || parsed.defaults.paragraph,
          s.paragraph
        ),
      };
    }
    return merged;
  };

  // Prefer Normal paragraph style if present
  const normalCandidate = parsed.namedStyles.find(
    (s) =>
      s.type === "paragraph" &&
      (s.styleId?.toLowerCase() === "normal" ||
        s.name?.toLowerCase() === "normal")
  );
  const normalResolved = resolveChain(normalCandidate);

  return {
    run: normalResolved?.run || parsed.defaults.run,
    paragraph: normalResolved?.paragraph || parsed.defaults.paragraph,
    normalStyle: normalResolved,
  };
}

const halfPointsToPt = (val?: string | number): number | undefined => {
  if (val === undefined || val === null) return undefined;
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return undefined;
  return n / 2;
};

const twipsToPt = (val?: string | number): number | undefined => {
  if (val === undefined || val === null) return undefined;
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return undefined;
  return n / 20;
};

const extractRunStyle = (rPr: any): ParsedRunStyle => {
  if (!rPr) return {};
  const fontsNode = rPr["w:rFonts"];
  const sizeNode = rPr["w:sz"];
  const colorNode = rPr["w:color"];
  return {
    fontFamily:
      fontsNode?.["@_w:ascii"] ||
      fontsNode?.["@_w:hAnsi"] ||
      fontsNode?.["@_w:cs"],
    fontSizePt: halfPointsToPt(sizeNode?.["@_w:val"] ?? sizeNode?.["@_w:sz"]),
    bold: !!rPr["w:b"],
    italic: !!rPr["w:i"],
    colorHex: colorNode?.["@_w:val"],
  };
};

const extractParagraphSpacing = (
  pPr: any
): ParsedParagraphSpacing | undefined => {
  if (!pPr) return undefined;
  const spacing = pPr["w:spacing"];
  if (!spacing) return undefined;
  return {
    beforePt: twipsToPt(spacing?.["@_w:before"]),
    afterPt: twipsToPt(spacing?.["@_w:after"]),
    linePt: spacing?.["@_w:line"]
      ? twipsToPt(spacing?.["@_w:line"])
      : undefined,
  };
};

const extractParagraphStyle = (pPr: any): ParsedParagraphStyle | undefined => {
  if (!pPr) return undefined;
  const alignment = pPr["w:jc"]?.["@_w:val"];
  const spacing = extractParagraphSpacing(pPr);
  return {
    alignment,
    spacing,
  };
};

export const parseDocxStyles = async (
  file: File
): Promise<DocxParsedStyles> => {
  const zip = await JSZip.loadAsync(file);
  const stylesXml = await zip.file("word/styles.xml")?.async("string");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });

  let defaults: ParsedStyleDefaults = {};
  const namedStyles: ParsedNamedStyle[] = [];

  if (stylesXml) {
    const stylesJson = parser.parse(stylesXml);
    const stylesRoot = stylesJson?.["w:styles"];

    const docDefaults = stylesRoot?.["w:docDefaults"];
    const rPrDefault = docDefaults?.["w:rPrDefault"]?.["w:rPr"];
    const pPrDefault = docDefaults?.["w:pPrDefault"]?.["w:pPr"];

    defaults = {
      run: extractRunStyle(rPrDefault),
      paragraph: extractParagraphStyle(pPrDefault),
    };

    const styleArr = stylesRoot?.["w:style"];
    const arr = Array.isArray(styleArr) ? styleArr : styleArr ? [styleArr] : [];
    for (const s of arr) {
      const styleId = s?.["@_w:styleId"];
      const type = s?.["@_w:type"];
      const name = s?.["w:name"]?.["@_w:val"];
      const rPr = s?.["w:rPr"];
      const pPr = s?.["w:pPr"];
      const basedOn = s?.["w:basedOn"]?.["@_w:val"];
      namedStyles.push({
        styleId,
        name,
        type,
        run: extractRunStyle(rPr),
        paragraph: extractParagraphStyle(pPr),
        basedOn,
      });
    }
  }

  return { defaults, namedStyles };
};
