import { useState, type FocusEvent } from "react";

export function useEdgeHoverFocus(
  options: Readonly<{
    /** When false, focus within will not make controls visible. */
    includeFocusWithin?: boolean;
  }> = {},
) {
  const { includeFocusWithin = true } = options;
  const [edgeHoverCount, setEdgeHoverCount] = useState(0);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const onHoverChange = (hovering: boolean) => {
    setEdgeHoverCount((v) => (hovering ? v + 1 : Math.max(0, v - 1)));
  };

  const onFocus = () => {
    if (!includeFocusWithin) return;
    setIsFocusWithin(true);
  };

  const onBlur = (e: FocusEvent) => {
    if (!includeFocusWithin) return;
    const nextTarget = e.relatedTarget as unknown as Node | null;
    if (!nextTarget) {
      setIsFocusWithin(false);
      return;
    }

    if (!e.currentTarget.contains(nextTarget)) {
      setIsFocusWithin(false);
    }
  };

  return {
    visible: edgeHoverCount > 0 || (includeFocusWithin && isFocusWithin),
    onHoverChange,
    onFocus,
    onBlur,
  };
}
