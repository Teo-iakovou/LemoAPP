import React from "react";

export default function PaymentPage() {
  return (
    <div className="payment-page p-4">
      <h1 className="text-2xl font-bold mb-4">Add Funds to SMS.to</h1>
      <iframe
        src="https://sms.to/app#/add-funds"
        title="SMS.to Add Funds"
        width="100%"
        height="800px"
        frameBorder="0"
        className="rounded-lg shadow-md"
      ></iframe>
    </div>
  );
}
