# buildingaiagents.eu

Statische site, gehost op GitHub Pages.

## Structuur
- `index.html` — Nederlandse versie
- `en/index.html` — Engelse versie
- `assets/style.css` — volledig design system
- `CNAME` — custom domein

## Nog te doen
1. **Contactformulier**: stuurt naar SalesPilot (`/api/lead`, zie `assets/contact.js`). De site moet in `WEBSITE_ORIGINS` op de server staan.
2. **Klantcases**: de sectie 'Voorbeelden' bevat placeholder-scenario's, duidelijk gemarkeerd. Vervangen zodra er echte cases zijn.
3. **DNS**: zie deploy-instructies.

## Lokaal bekijken
    python3 -m http.server 8080
