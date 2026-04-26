import { redirect } from "next/navigation";

export default function PrescriptionsRedirect() {
  redirect("/patient/prescriptions");
}
