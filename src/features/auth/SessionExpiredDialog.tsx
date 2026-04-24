import { Text } from "@tamagui/core";

import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { BoardActionButton } from "../boards/ui";

type SessionExpiredDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignInAgain: () => void;
}>;

export function SessionExpiredDialog({
  open,
  onOpenChange,
  onSignInAgain,
}: SessionExpiredDialogProps) {
  return (
    <PrettyModalWrap
      open={open}
      onOpenChange={onOpenChange}
      title="Session expired"
      description="Your session is no longer valid, so your last change was not saved. Sign in again to continue."
      fullScreenOnMobile
      preventOutsideClose
      closeLabel="Cancel"
      footer={
        <>
          <BoardActionButton tone="ghost" onPress={() => onOpenChange(false)}>
            Cancel
          </BoardActionButton>
          <BoardActionButton
            tone="accent"
            onPress={() => {
              onOpenChange(false);
              onSignInAgain();
            }}
          >
            Sign in again
          </BoardActionButton>
        </>
      }
    >
      <Text color="$color11">
        Unsaved edits may be lost if you continue without signing in again.
      </Text>
    </PrettyModalWrap>
  );
}
