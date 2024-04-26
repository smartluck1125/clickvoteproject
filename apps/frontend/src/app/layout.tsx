import interClass from '@gitroom/react/helpers/inter.font';

export const dynamic = 'force-dynamic';
import './global.css';
import 'react-tooltip/dist/react-tooltip.css';

import LayoutContext from '@gitroom/frontend/components/layout/layout.context';
import { ReactNode } from 'react';
import { Chakra_Petch } from 'next/font/google';

const chakra = Chakra_Petch({ weight: '400', subsets: ['latin'] });

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html className={interClass}>
      <head>
        <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
      <body className={chakra.className}>
        <LayoutContext>{children}</LayoutContext>
      </body>
    </html>
  );
}
