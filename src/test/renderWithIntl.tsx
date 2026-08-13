import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/cs.json";

// Components in this app all read copy through useTranslations, which throws
// without a provider above them. Rendering with the real cs.json rather than a
// stub means a test also fails when a component asks for a key that no longer
// exists — the same guarantee the IntlMessages type augmentation gives at
// compile time, extended to keys built at runtime.
export function renderWithIntl(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="cs" messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
