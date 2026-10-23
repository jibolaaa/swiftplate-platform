// Paystack runs in test mode here, so no real money moves. These are
// Paystack's own test details (paystack.com/docs/payments/test-payments).
export default function TestCard() {
  return (
    <details className="testcard">
      <summary>Paying with a test card</summary>
      <dl>
        <div><dt>Card number</dt><dd>4084 0840 8408 4081</dd></div>
        <div><dt>Expiry</dt><dd>Any future date, like 09/27</dd></div>
        <div><dt>CVV</dt><dd>408</dd></div>
      </dl>
      <p>Bank transfer works too: Paystack shows a test account and the steps on screen. This is a demo, so no real money is taken.</p>
    </details>
  );
}
