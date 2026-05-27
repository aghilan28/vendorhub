"use client";

import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { FormShell } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";

export default function SellerRegistrationPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <LanguageSwitcher />
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <Badge variant="default">{t("common.localMode")}</Badge>
        <p className="mt-2 font-medium">{t("seller.guidanceTitle")}</p>
        <p className="mt-1">{t("seller.guidanceBody")}</p>
      </div>
      <FormShell
        title={t("seller.registrationTitle")}
        description={t("seller.registrationDescription")}
        fields={[t("seller.businessName"), t("seller.ownerName"), t("seller.email"), t("seller.phone"), t("seller.category")]}
      />
    </div>
  );
}
