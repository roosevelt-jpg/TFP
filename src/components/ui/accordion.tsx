import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import { cn } from "@/lib/cn";

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("border-hairline flex w-full flex-col border-t", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-hairline border-b", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/trigger text-text flex flex-1 touch-manipulation items-center justify-between gap-4 px-0.5 py-5 text-left text-[1.05rem] font-medium outline-none focus-visible:underline",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        <span
          aria-hidden
          className="border-hairline-strong text-text grid size-[26px] shrink-0 place-items-center rounded-xs border text-[1.05rem] leading-none transition-transform duration-300 group-aria-expanded/trigger:rotate-45 group-aria-expanded/trigger:border-current"
        >
          +
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden"
      {...props}
    >
      <p
        className={cn(
          "text-muted max-w-[60ch] px-0.5 pb-5 leading-relaxed",
          className,
        )}
      >
        {children}
      </p>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
