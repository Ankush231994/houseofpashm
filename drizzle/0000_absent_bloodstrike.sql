CREATE TABLE `catalog_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`created_by` text NOT NULL,
	`product_row_count` integer DEFAULT 0 NOT NULL,
	`image_row_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`delta` integer NOT NULL,
	`resulting_quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`import_id` text,
	`created_by` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`import_id`) REFERENCES `catalog_imports`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "inventory_movements_quantity_valid" CHECK("inventory_movements"."resulting_quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX `inventory_movements_variant_created_idx` ON `inventory_movements` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`sort_order` integer DEFAULT 1 NOT NULL,
	`filename` text,
	`alt_text` text NOT NULL,
	`source_page_url` text,
	`source_asset_url` text,
	`storage_key` text,
	`ownership_confirmed` integer DEFAULT false NOT NULL,
	`operator_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "product_images_order_valid" CHECK("product_images"."sort_order" > 0),
	CONSTRAINT "product_images_location_present" CHECK("product_images"."source_asset_url" is not null or "product_images"."storage_key" is not null)
);
--> statement-breakpoint
CREATE INDEX `product_images_product_order_idx` ON `product_images` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`colour` text,
	`size` text,
	`price_paise` integer NOT NULL,
	`mrp_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 2 NOT NULL,
	`weight_grams` integer,
	`length_mm` integer,
	`width_mm` integer,
	`height_mm` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "product_variants_price_valid" CHECK("product_variants"."price_paise" >= 0),
	CONSTRAINT "product_variants_mrp_valid" CHECK("product_variants"."mrp_paise" >= "product_variants"."price_paise"),
	CONSTRAINT "product_variants_stock_valid" CHECK("product_variants"."stock_quantity" >= 0 and "product_variants"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`description` text DEFAULT '' NOT NULL,
	`fabric` text,
	`embroidery` text,
	`care_instructions` text,
	`tax_classification` text,
	`tax_rate_basis_points` integer,
	`operator_verified` integer DEFAULT false NOT NULL,
	`source_catalog_url` text,
	`source_instagram_url` text,
	`source_post_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "products_tax_rate_valid" CHECK("products"."tax_rate_basis_points" is null or ("products"."tax_rate_basis_points" >= 0 and "products"."tax_rate_basis_points" <= 10000))
);
--> statement-breakpoint
CREATE INDEX `products_status_category_idx` ON `products` (`status`,`category`);