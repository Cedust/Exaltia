import { PhaserGame } from '../view/PhaserGame'

export default function App() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <PhaserGame />
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-baseline justify-between p-4">
        <h1 className="text-xl font-semibold tracking-wide">Exaltia: Paragons of the Oath</h1>
        <span className="text-sm text-physical">Spike 1 · Core Battle</span>
      </header>
    </div>
  )
}
