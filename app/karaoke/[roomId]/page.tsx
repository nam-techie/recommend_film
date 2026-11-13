import KaraokePilotPage from '@/components/karaoke/KaraokePilotPage'
export default function Page({ params }: { params: { roomId: string } }) { return <KaraokePilotPage roomId={params.roomId} /> }
