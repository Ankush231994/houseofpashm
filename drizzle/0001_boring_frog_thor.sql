CREATE TABLE `admin_audit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_entity_idx` ON `admin_audit_entries` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "inventory_reservations_quantity_valid" CHECK("inventory_reservations"."quantity" > 0 and "inventory_reservations"."quantity" <= 10)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_reservations_order_variant_unique` ON `inventory_reservations` (`order_id`,`variant_id`);--> statement-breakpoint
CREATE INDEX `inventory_reservations_status_expiry_idx` ON `inventory_reservations` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`sku` text NOT NULL,
	`product_name` text NOT NULL,
	`colour` text,
	`size` text,
	`image_url` text,
	`unit_price_paise` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_paise` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_items_quantity_valid" CHECK("order_items"."quantity" > 0 and "order_items"."quantity" <= 10),
	CONSTRAINT "order_items_total_valid" CHECK("order_items"."unit_price_paise" >= 0 and "order_items"."line_total_paise" = "order_items"."unit_price_paise" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_status_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_status_events_order_idx` ON `order_status_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`payment_status` text DEFAULT 'created' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`address_line_1` text NOT NULL,
	`address_line_2` text,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`postal_code` text NOT NULL,
	`country` text DEFAULT 'IN' NOT NULL,
	`subtotal_paise` integer NOT NULL,
	`shipping_paise` integer NOT NULL,
	`tax_paise` integer DEFAULT 0 NOT NULL,
	`total_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`gateway_order_id` text,
	`gateway_payment_id` text,
	`reservation_expires_at` integer NOT NULL,
	`tracking_provider` text,
	`tracking_number` text,
	`tracking_url` text,
	`customer_note` text,
	`operator_note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`paid_at` integer,
	`shipped_at` integer,
	`delivered_at` integer,
	`cancelled_at` integer,
	CONSTRAINT "orders_totals_valid" CHECK("orders"."subtotal_paise" >= 0 and "orders"."shipping_paise" >= 0 and "orders"."tax_paise" >= 0 and "orders"."total_paise" = "orders"."subtotal_paise" + "orders"."shipping_paise" + "orders"."tax_paise")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_gateway_order_unique` ON `orders` (`gateway_order_id`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_customer_email_idx` ON `orders` (`customer_email`);--> statement-breakpoint
CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`gateway_order_id` text NOT NULL,
	`gateway_payment_id` text,
	`status` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`signature_verified` integer DEFAULT false NOT NULL,
	`error_code` text,
	`error_description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "payment_attempts_amount_valid" CHECK("payment_attempts"."amount_paise" >= 0)
);
--> statement-breakpoint
CREATE INDEX `payment_attempts_order_idx` ON `payment_attempts` (`order_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_attempts_gateway_payment_unique` ON `payment_attempts` (`gateway_payment_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`processed_at` integer
);
--> statement-breakpoint
CREATE INDEX `webhook_events_status_created_idx` ON `webhook_events` (`status`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER `inventory_reservation_insert_active`
BEFORE INSERT ON `inventory_reservations`
WHEN NEW.`status` = 'active'
BEGIN
  UPDATE `product_variants`
  SET `stock_quantity` = `stock_quantity` - NEW.`quantity`, `updated_at` = unixepoch()
  WHERE `id` = NEW.`variant_id` AND `active` = 1 AND `stock_quantity` >= NEW.`quantity`;
  SELECT CASE WHEN changes() = 0 THEN RAISE(ABORT, 'insufficient_stock') END;
  INSERT INTO `inventory_movements` (`id`,`variant_id`,`delta`,`resulting_quantity`,`reason`,`created_by`,`note`,`created_at`)
  VALUES (lower(hex(randomblob(16))), NEW.`variant_id`, -NEW.`quantity`, (SELECT `stock_quantity` FROM `product_variants` WHERE `id` = NEW.`variant_id`), 'reserve', 'checkout', 'Inventory reserved for pending payment.', unixepoch());
END;
--> statement-breakpoint
CREATE TRIGGER `inventory_reservation_release_active`
AFTER UPDATE OF `status` ON `inventory_reservations`
WHEN OLD.`status` = 'active' AND NEW.`status` = 'released'
BEGIN
  UPDATE `product_variants`
  SET `stock_quantity` = `stock_quantity` + OLD.`quantity`, `updated_at` = unixepoch()
  WHERE `id` = OLD.`variant_id`;
  INSERT INTO `inventory_movements` (`id`,`variant_id`,`delta`,`resulting_quantity`,`reason`,`created_by`,`note`,`created_at`)
  VALUES (lower(hex(randomblob(16))), OLD.`variant_id`, OLD.`quantity`, (SELECT `stock_quantity` FROM `product_variants` WHERE `id` = OLD.`variant_id`), 'release', 'system', 'Expired or cancelled reservation released.', unixepoch());
END;
--> statement-breakpoint
CREATE TRIGGER `inventory_reservation_delete_active`
BEFORE DELETE ON `inventory_reservations`
WHEN OLD.`status` = 'active'
BEGIN
  UPDATE `product_variants`
  SET `stock_quantity` = `stock_quantity` + OLD.`quantity`, `updated_at` = unixepoch()
  WHERE `id` = OLD.`variant_id`;
  INSERT INTO `inventory_movements` (`id`,`variant_id`,`delta`,`resulting_quantity`,`reason`,`created_by`,`note`,`created_at`)
  VALUES (lower(hex(randomblob(16))), OLD.`variant_id`, OLD.`quantity`, (SELECT `stock_quantity` FROM `product_variants` WHERE `id` = OLD.`variant_id`), 'release', 'system', 'Active reservation deleted and released.', unixepoch());
END;
