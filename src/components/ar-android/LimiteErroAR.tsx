import { Component, type ReactNode } from 'react';

interface Props {
  aoFechar: () => void;
  children: ReactNode;
}

interface Estado {
  erro: boolean;
}

/**
 * Se algo der errado na tela da câmera (Android), mostra uma mensagem
 * em vez de deixar a página inteira em branco.
 */
export default class LimiteErroAR extends Component<Props, Estado> {
  state: Estado = { erro: false };

  static getDerivedStateFromError(): Estado {
    return { erro: true };
  }

  componentDidCatch(erro: unknown) {
    console.error('[AR Android]', erro);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-grafite-900 p-6 text-center text-white">
        <div className="max-w-sm">
          <p className="text-xl font-bold">Não foi possível abrir a visualização</p>
          <p className="mt-2 text-sm text-white/70">Verifique sua conexão e tente de novo.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn mt-6 w-full bg-white text-grafite-900"
          >
            Tentar de novo
          </button>
          <button
            type="button"
            onClick={() => {
              this.setState({ erro: false });
              this.props.aoFechar();
            }}
            className="mt-3 min-h-12 w-full text-sm font-semibold text-white/80"
          >
            Voltar ao produto
          </button>
        </div>
      </div>
    );
  }
}
