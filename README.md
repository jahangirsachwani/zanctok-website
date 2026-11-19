# Zanctok Pharmaceutical Laboratories — Website

The redesigned site for www.zanctok.com: static HTML, CSS and JS, plus one PHP file for the forms. It doesn't need a database or a framework.

## Folder structure

```
build.js            Assembles the pages: node build.js
serve.js            Local preview: node serve.js  →  http://localhost:8080
src/partials/       Shared head, header (menu + icons) and footer
src/pages/          Page content (edit these, then run build)
site/               ← THE WEBSITE. Upload this folder's contents to GoDaddy.
  assets/css/style.css
  assets/js/main.js            Animations, menu, lightbox, form sending
  assets/js/products-data.js   ← PRODUCT LIST (edit to add / change products)
  assets/js/catalogue.js       Catalogue search/filter and product pages
  forms/submit.php             Handles contact, partner and side-effect forms
  forms/config.php             ← Form email settings
  .htaccess                    HTTPS, old-URL redirects, security, caching
```

## Editing

- **Text and pages:** edit `src/pages/*.html`, then run `node build.js`. Don't edit `site/*.html` directly, because the next build overwrites them.
- **Header, menu or footer:** edit `src/partials/`, then run `node build.js`.
- **Products:** edit `site/assets/js/products-data.js`, one line per product. No build is needed. Product counts across the site update automatically.

## Deploying to GoDaddy (cPanel, Linux, PHP 8.3)

1. Back up the current site from cPanel → File Manager (download `public_html`).
2. **Keep the existing `images/` folder on the server.** All pictures currently load from `https://www.zanctok.com/images/...`.
3. Upload everything inside `site/` into `public_html/`, including the hidden `.htaccess` files.
4. Forms:
   - In cPanel → Email Accounts, create `noreply@zanctok.com`, or change `from_email` in `forms/config.php` to an existing @zanctok.com address.
   - Set the recipients in `forms/config.php`.
   - In DNS, make sure the SPF record includes `include:secureserver.net`.
   - Send a test from each form: Contact, Partner With Us and Report a Side Effect. Check the spam folder too.
   - A backup copy of each submission is saved in `forms/data/`, which can't be reached from the web.
5. Test that the old addresses redirect, for example `/Products.html` → `/products.html` and `/Contact.php` → `/contact.html`.
6. Submit `https://www.zanctok.com/sitemap.xml` in Google Search Console.

## Before launch: confirm with the client

- [ ] Statistics: 40+ years, 100+ cities, 28+ institutions. The product count is calculated automatically.
- [ ] Mission and Vision text on the About page. These were drafted from the old site's wording and need approval.
- [ ] Timeline milestones and their years on the About page. Only 1984 and 2024 are confirmed.
- [ ] Certificate expiry dates. The cards currently say "Certified" or "Current".
- [ ] Office hours on the Contact page (Mon–Sat, 9–5 is a placeholder).
- [ ] Product data was cleaned up from the old list. Spelling was corrected (Hypertencive → Antihypertensive, Ameobic → Amoebic, and so on). IRAD (risperidone) was reclassified from "Anti Depressant" to "Antipsychotic". Tincture Iodine was listed as "Anti thyroid" and is now "Antiseptic (External)". Please have a pharmacist verify the list.
- [ ] Office phone: the old header showed 022-3400289 and the contact page showed 022-3400276. The new site uses 3400276.
- [ ] Product catalogue PDF: the link still points to the old download script. Copy the PDF to `site/downloads/` and update the link in `src/pages/products.html`.
- [ ] High-resolution photos, a vector logo (SVG) and product pack shots.
