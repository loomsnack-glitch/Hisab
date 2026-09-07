# Commercial License fulfillment is triggered by idempotent Razorpay order.paid events

Hisab retains every signature-verified Razorpay `order.paid` webhook as a Commercial Payment Event before idempotently fulfilling its Commercial Quote. Related events such as `payment.captured` do not independently change commercial access, and the webhook receives a rapid successful response while fulfillment remains safe to retry.
