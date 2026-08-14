export const metadata = {
  title: "Shopify Portfolio Dashboard",
  description: "Multi-store performance analytics — ColorProof, NeumaBeauty, Number 4 Hair",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0B0F1A" }}>
        {children}
      </body>
    </html>
  );
}
