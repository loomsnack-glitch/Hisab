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

export const keepOutFitsStock = (
  keepOut: LabelMillimetreBox,
  stock: { widthMm: number; heightMm: number },
) =>
  keepOut.xMm >= 0 &&
  keepOut.yMm >= 0 &&
  keepOut.xMm + keepOut.widthMm <= stock.widthMm &&
  keepOut.yMm + keepOut.heightMm <= stock.heightMm;

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
