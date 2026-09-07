'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export const Interruptor = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 ease-calmo',
      'data-[state=checked]:bg-verde data-[state=unchecked]:bg-white/[0.14]',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-[16px] w-[16px] translate-x-[3px] rounded-full bg-creme transition-transform duration-200 ease-calmo data-[state=checked]:translate-x-[19px]" />
  </SwitchPrimitive.Root>
));
Interruptor.displayName = 'Interruptor';
