import { useState } from 'react';

export default function Galeria({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  if (fotos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-areia-100 ring-1 ring-areia-200">
        <img src={fotos[atual]} alt={`${nome} — foto ${atual + 1}`} className="size-full object-cover" />
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={foto}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === atual}
              className={`size-20 shrink-0 overflow-hidden rounded-xl bg-areia-100 ring-2 transition ${
                i === atual ? 'ring-grafite-900' : 'ring-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={foto} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
