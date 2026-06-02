/**
 * Public legal / imprint placeholders. Replace with real company data before relying on these pages as binding disclosures.
 * Wire env vars in build if you prefer (e.g. VITE_LEGAL_ENTITY_NAME).
 */
export const SITE_LEGAL = {
  /** Registered legal name of the controller */
  legalEntityName:
    import.meta.env.VITE_LEGAL_ENTITY_NAME?.trim() || "[Registered legal entity — configure VITE_LEGAL_ENTITY_NAME]",
  /** Principal place of business / registered address */
  registeredAddress:
    import.meta.env.VITE_LEGAL_REGISTERED_ADDRESS?.trim() ||
    "[Registered address — configure VITE_LEGAL_REGISTERED_ADDRESS]",
  /** Primary privacy / legal contact */
  privacyEmail:
    import.meta.env.VITE_LEGAL_PRIVACY_EMAIL?.trim() || "[privacy@yourdomain — configure VITE_LEGAL_PRIVACY_EMAIL]",
  /** Customer support */
  supportEmail:
    import.meta.env.VITE_LEGAL_SUPPORT_EMAIL?.trim() || "[support@yourdomain — configure VITE_LEGAL_SUPPORT_EMAIL]",
  /** Security vulnerability reports */
  securityEmail:
    import.meta.env.VITE_LEGAL_SECURITY_EMAIL?.trim() || "[security@yourdomain — configure VITE_LEGAL_SECURITY_EMAIL]",
  /** Supervisory authority (EU/HU example; adjust if US-only entity) */
  supervisoryAuthorityName: "Hungarian National Authority for Data Protection and Freedom of Information (NAIH)",
  supervisoryAuthorityUrl: "https://www.naih.hu/",
  /** Last updated string shown if locale string missing */
  defaultLastUpdated: "2026-05-06",
} as const;
