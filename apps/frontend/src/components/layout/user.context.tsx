'use client';

import { createContext, FC, ReactNode, useContext } from 'react';
import { User } from '@prisma/client';
import {
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

export const UserContext = createContext<
  | undefined
  | (User & {
      orgId: string;
      tier: PricingInnerInterface;
      role: 'USER' | 'ADMIN' | 'SUPERADMIN';
      totalChannels: number;
    })
>(undefined);

export const ContextWrapper: FC<{
  user: User & {
    orgId: string;
    tier: 'FREE' | 'STANDARD' | 'PRO';
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
    totalChannels: number;
  };
  children: ReactNode;
}> = ({ user, children }) => {
  const values = user ? { ...user, tier: pricing[user.tier] } : ({} as any);
  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
