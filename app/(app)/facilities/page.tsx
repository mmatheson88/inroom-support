import { createClient } from '@/lib/supabase/server'
import FacilitiesClient from './facilities-client'
import Topbar from '@/components/topbar'

export default async function FacilitiesPage() {
  const supabase = await createClient()
  const { data: facilities } = await supabase
    .from('facilities')
    .select('*')
    .order('name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Facilities" />
      <FacilitiesClient facilities={facilities ?? []} />
    </div>
  )
}
