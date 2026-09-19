import { createContext, useContext } from "react";

// Lets any screen reopen the setup wizard. The wizard normally only shows on a first run, which
// means the part of the product that explains the most is invisible to anyone already set up —
// including every demo visitor. Preferences offers a replay through this.
export const SetupContext = createContext<{ openSetup: () => void } | null>(null);

export function useSetup(): { openSetup: () => void } | null {
  return useContext(SetupContext);
}
