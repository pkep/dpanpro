DO $$
DECLARE
  nullable_column text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partner_applications'
      AND column_name = 'motivation'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partner_applications'
      AND column_name = 'presentation'
  ) THEN
    EXECUTE 'ALTER TABLE public.partner_applications RENAME COLUMN motivation TO presentation';
  END IF;

  FOREACH nullable_column IN ARRAY ARRAY[
    'vat_number',
    'legal_status',
    'address',
    'postal_code',
    'city',
    'birth_date',
    'birth_place',
    'insurance_company',
    'insurance_policy_number',
    'insurance_expiry_date',
    'presentation',
    'bank_account_holder',
    'bank_name',
    'iban',
    'bic'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'partner_applications'
        AND column_name = nullable_column
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.partner_applications ALTER COLUMN %I DROP NOT NULL',
        nullable_column
      );
    END IF;
  END LOOP;
END
$$;