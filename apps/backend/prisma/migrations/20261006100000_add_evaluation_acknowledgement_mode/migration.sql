-- Existing signatures intentionally remain NULL: the legacy records do not
-- provide enough information to infer the server's acknowledgement choice.
CREATE TYPE "AcknowledgementMode" AS ENUM ('ACKNOWLEDGED', 'ACKNOWLEDGED_WITH_RESERVATION');

ALTER TABLE "SignatureRecord"
ADD COLUMN "acknowledgementMode" "AcknowledgementMode";
