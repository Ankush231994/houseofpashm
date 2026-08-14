# HOUSEOFPASHM catalogue intake

This directory is the controlled source for Milestone 0 catalogue preparation.

## Files

- `products.csv` contains one row per sellable variant. Repeat product-level fields for each size/colour variant and give every row the same product SKU plus a distinct variant suffix if required.
- `product-images.csv` maps one or more brand-owned image files to a product SKU in display order.
- `sources.csv` records the owner-provided WhatsApp and Instagram sources and whether their data can be retrieved safely.

Open the CSV files in Excel, Google Sheets or LibreOffice. Preserve the exact column names because the later importer will validate them.

## Required product workflow

1. Select the first 12–20 products for launch.
2. Enter only currently available products in `products.csv`.
3. Use a unique stable SKU, such as `HOP-KUR-001`, and a lowercase hyphenated slug.
4. Enter prices as rupee numbers without `₹` or commas.
5. Add one row per sellable size/colour variant and its actual stock.
6. Leave tax fields empty until a qualified adviser confirms the classification and rate.
7. Set `operator_verified` to `yes` only after the owner checks the product, price, stock and description.
8. Keep `status` as `draft` until every required field and image is approved.

## Image workflow

Product images could not be downloaded safely from the supplied public links. The public WhatsApp page exposes only a catalogue-cover image, and Instagram exposes only a profile image. Product content requires an authenticated owner session or authorized API access. The visible CDN URLs are temporary and must not be stored as production image URLs.

For each launch product:

1. In WhatsApp Business or Instagram, save the original brand-owned product photos to your computer.
2. Name files using the SKU and order, for example `HOP-KUR-001-01.jpg`, `HOP-KUR-001-02.jpg`.
3. Put the files in a local folder outside Git until the R2 media workflow is implemented.
4. Add one row per image to `product-images.csv`.
5. Record the source post/catalogue page and set `ownership_confirmed=yes` only when HOUSEOFPASHM has the right to use the photo commercially.
6. Set `operator_verified=yes` after checking that the image matches the SKU/variant.

Do not use screenshots when original photos are available. Do not commit customer chats, phone address books, access tokens, login cookies or WhatsApp/Instagram exports containing personal information.

## What the owner needs to provide next

Choose either method:

- Preferred: download the original product photos and place them in a folder, then share that folder with the coding agent together with product names and prices.
- Alternative: export or copy the first 12–20 catalogue entries into `products.csv`, including direct product/post links, then attach the matching original images.

Once those assets are available, the agent can normalize filenames, validate dimensions, detect duplicates, complete `product-images.csv`, and prepare the R2 upload/import process.
