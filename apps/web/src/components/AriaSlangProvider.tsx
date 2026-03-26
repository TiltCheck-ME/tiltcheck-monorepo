'use client';

import { useAriaSlang } from '@/hooks/useAriaSlang';

// This component's sole purpose is to activate the useAriaSlang hook
// on the client-side without turning the entire root layout into a client component.
const AriaSlangProvider = () => {
  useAriaSlang();
  return null; // This component does not render anything
};

export default AriaSlangProvider;
