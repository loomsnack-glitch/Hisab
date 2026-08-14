export type LabelMillimetreBox = {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

export type LabelContentInset = {
  topMm: number;
  rightMm: number;
  bottomMm: number;
  leftMm: number;
};

export const millimetreBoxesIntersect = (
  left: LabelMillimetreBox,
  right: LabelMillimetreBox,
) =>
  left.xMm < right.xMm + right.widthMm &&
  left.xMm + left.widthMm > right.xMm &&
  left.yMm < right.yMm + right.heightMm &&
  left.yMm + left.heightMm > right.yMm;

export const labelTemplateKeepOutsOverlapPrintedContent = (template: {
  keepOuts: LabelMillimetreBox[];
  elements: LabelMillimetreBox[];
}) =>
  template.keepOuts.some((keepOut) =>
    template.elements.some((element) => millimetreBoxesIntersect(element, keepOut)),
  );

export const keepOutFitsStock = (
  keepOut: LabelMillimetreBox,
  stock: { widthMm: number; heightMm: number },
) =>
  keepOut.xMm >= 0 &&
  keepOut.yMm >= 0 &&
  keepOut.xMm + keepOut.widthMm <= stock.widthMm &&
  keepOut.yMm + keepOut.heightMm <= stock.heightMm;

export const leftoverPrintableBox = (
  stock: { widthMm: number; heightMm: number },
  keepOuts: LabelMillimetreBox[],
): LabelMillimetreBox => {
  const almost = (left: number, right: number) => Math.abs(left - right) < 0.05;
  let left = 0;
  let top = 0;
  let right = stock.widthMm;
  let bottom = stock.heightMm;

  for (const keepOut of keepOuts) {
    const spansWidth =
      keepOut.xMm <= 0.05 && keepOut.xMm + keepOut.widthMm >= stock.widthMm - 0.05;
    const spansHeight =
      keepOut.yMm <= 0.05 && keepOut.yMm + keepOut.heightMm >= stock.heightMm - 0.05;

    if (spansWidth && keepOut.yMm <= 0.05) {
      top = Math.max(top, keepOut.yMm + keepOut.heightMm);
    }
    if (spansWidth && almost(keepOut.yMm + keepOut.heightMm, stock.heightMm)) {
      bottom = Math.min(bottom, keepOut.yMm);
    }
    if (spansHeight && keepOut.xMm <= 0.05) {
      left = Math.max(left, keepOut.xMm + keepOut.widthMm);
    }
    if (spansHeight && almost(keepOut.xMm + keepOut.widthMm, stock.widthMm)) {
      right = Math.min(right, keepOut.xMm);
    }
  }

  return {
    xMm: left,
    yMm: top,
    widthMm: Math.max(0, right - left),
    heightMm: Math.max(0, bottom - top),
  };
};

export const mapLabelElementsIntoBox = <T extends LabelMillimetreBox>(
  elements: T[],
  fromStock: { widthMm: number; heightMm: number },
  toBox: LabelMillimetreBox,
): T[] => {
  if (
    fromStock.widthMm <= 0 ||
    fromStock.heightMm <= 0 ||
    toBox.widthMm <= 0 ||
    toBox.heightMm <= 0
  ) {
    return elements;
  }

  const scaleX = toBox.widthMm / fromStock.widthMm;
  const scaleY = toBox.heightMm / fromStock.heightMm;

  return elements.map((element) => ({
    ...element,
    xMm: toBox.xMm + element.xMm * scaleX,
    yMm: toBox.yMm + element.yMm * scaleY,
    widthMm: element.widthMm * scaleX,
    heightMm: element.heightMm * scaleY,
  }));
};

export const keepOutsFromContentInset = (
  stock: { widthMm: number; heightMm: number },
  inset: LabelContentInset,
): LabelMillimetreBox[] => {
  const keepOuts: LabelMillimetreBox[] = [];

  if (inset.topMm > 0) {
    keepOuts.push({
      xMm: 0,
      yMm: 0,
      widthMm: stock.widthMm,
      heightMm: inset.topMm,
    });
  }

  if (inset.rightMm > 0) {
    keepOuts.push({
      xMm: stock.widthMm - inset.rightMm,
      yMm: 0,
      widthMm: inset.rightMm,
      heightMm: stock.heightMm,
    });
  }

  if (inset.bottomMm > 0) {
    keepOuts.push({
      xMm: 0,
      yMm: stock.heightMm - inset.bottomMm,
      widthMm: stock.widthMm,
      heightMm: inset.bottomMm,
    });
  }

  if (inset.leftMm > 0) {
    keepOuts.push({
      xMm: 0,
      yMm: 0,
      widthMm: inset.leftMm,
      heightMm: stock.heightMm,
    });
  }

  return keepOuts;
};
