# Commercial Checkout uses server-created Razorpay Orders from immutable Quotes

Hisab calculates and persists an immutable Commercial Quote before creating a Razorpay Order for its exact final amount. Razorpay Checkout may collect payment for that Order, but neither the browser nor a later catalog edit can change the fulfilled purchase; the verified webhook fulfills only the Quote bound to its Order.
