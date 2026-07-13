import { PublicProfilePage } from '@/components/account/PublicProfilePage'

export default function Page({ params }: { params: { username: string } }) { return <PublicProfilePage username={params.username} /> }
