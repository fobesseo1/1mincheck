// shadcn Sheet (Radix Dialog, 아래에서 올라오는 시트): 허리 입력처럼 결과 화면에서 바로 값을 넣을 때
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
export function SheetContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content data-slot="sheet-content"
        className={cn('fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[440px] flex-col gap-[18px] rounded-t-[24px] bg-white px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] text-ink shadow-[0_-12px_40px_rgba(0,0,0,.18)] outline-none',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom', className)} {...props}>
        <span aria-hidden className="h-[5px] w-10 self-center rounded-full bg-[#dcdcd8]" />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
