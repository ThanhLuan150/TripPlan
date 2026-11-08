import {ReactNode} from 'react';
import BackHeader from './BackHeader';

// Shell for the stack screens that have no tab bar on mobile.
export default function Page({
  title,
  children,
  onBack,
  wide = false,
}: {
  title: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <BackHeader title={title} onBack={onBack} />
      <main
        className={`mx-auto w-full px-4 py-5 md:px-6 md:py-8 ${
          wide ? 'max-w-5xl' : 'max-w-3xl'
        }`}>
        {children}
      </main>
    </div>
  );
}
