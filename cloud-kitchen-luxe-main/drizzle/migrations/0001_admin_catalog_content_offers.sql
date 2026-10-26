CREATE TABLE public.products (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Chicken favourites', price INTEGER NOT NULL DEFAULT 0, veg BOOLEAN NOT NULL DEFAULT false, image TEXT NOT NULL DEFAULT '', unit TEXT NOT NULL DEFAULT 'Frozen pack', available BOOLEAN NOT NULL DEFAULT true, featured BOOLEAN NOT NULL DEFAULT false, sort INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_products ON public.products FOR SELECT TO anon USING (available);
CREATE POLICY staff_read_products ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_write_products ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_update_products ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_delete_products ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.site_content (key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_content ON public.site_content FOR SELECT TO anon USING (true);
CREATE POLICY staff_write_content ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_update_content ON public.site_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE TABLE public.offers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', discount_type TEXT NOT NULL DEFAULT 'percent', value INTEGER NOT NULL DEFAULT 0, starts_at TIMESTAMPTZ NOT NULL DEFAULT now(), ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'), active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_offers ON public.offers FOR SELECT TO anon USING (active AND now() BETWEEN starts_at AND ends_at);
CREATE POLICY staff_read_offers ON public.offers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_write_offers ON public.offers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_update_offers ON public.offers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY staff_delete_offers ON public.offers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

INSERT INTO public.products (id, name, description, category, price, veg, unit, featured, sort) VALUES
('chicken-cheese-nuggets','Chicken Cheese Nuggets','Golden crumb, tender chicken, and a cheesy centre. A little bite worth sharing.','Chicken favourites',320,false,'Frozen pack',true,1),
('chilli-garlic-fingers','Chicken Chilli Garlic Fingers','ITC Master Chef chicken fingers with a chilli-garlic kick.','Chicken favourites',350,false,'Frozen pack',true,2),
('fish-fingers','Fish Fingers','Ready-to-cook fish fingers with a crisp breadcrumb coating.','Seafood',390,false,'Frozen pack',true,3),
('veggie-pizza-pocket','Veggie Pizza Pocket','ITC Master Chef pizza pockets. A savoury vegetable filling in a golden shell.','Vegetarian',280,true,'Frozen pack',false,4),
('veg-momos','Veg Momos','Bite-size veg momos, ready to steam or pan-fry.','Momos & more',250,true,'Frozen pack',false,5);

INSERT INTO public.site_content (key, value) VALUES
('hero','{"heading":"A world of flavour, closer to home.","subtitle":"Your frozen favourites, from Pune.","image":""}'),
('business','{"phone":"9322605514","otherPhone":"7709486702","whatsapp":"919322605514","address":"F 207, above Al Azam Collection, Lifeline Hospital, Pune 411048","instagram":"https://www.instagram.com/freshfrozenfood.pune/"}'),
('story','{"heading":"Our story","body":"Quality always. Fresh Frozen Food brings ready-to-cook favourites to homes across Pune."}');