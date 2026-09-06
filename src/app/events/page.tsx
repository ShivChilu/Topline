import OpportunitiesPage from "@/app/opportunities/page";

export const revalidate = 0;

export default async function EventsPage(props: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  return <OpportunitiesPage {...props} />;
}
