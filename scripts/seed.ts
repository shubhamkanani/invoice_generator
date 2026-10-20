import mongoose from "mongoose";
import { DEMO_USER, seedDemo } from "@/lib/seed/demo";

async function main() {
  const { invoiceCount } = await seedDemo();
  console.log(`Seeded the demo account with ${invoiceCount} invoices.`);
  console.log(`Log in with ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
