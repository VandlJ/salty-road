import type { Metadata } from "next";
import RegistrationSection from "@/components/registration-section";

// Unlisted route: not in the navbar, not in the sitemap, disallowed in
// robots.txt. Volume 1 is archived so the homepage no longer carries the
// sign-up form, but the whole registration path (/api/register, the confirm
// email, the /check lookup) has to keep working for Volume 2 — and, more to
// the point, has to keep being exercised by the e2e suite in the meantime.
// Without this the first Volume 2 deploy would be the first time anyone found
// out whether registration still works.
//
// Whether the form actually accepts submissions is still governed by the
// `registration_open` setting, same as before.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="w-full bg-black">
      <RegistrationSection />
    </div>
  );
}
