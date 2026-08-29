# Zenith

Aplicação web instalável para gestão da operação agrícola. Reúne cadastro de fazenda, diagnóstico por imagem, monitoramento de plantio, clima, diário de campo, mapa de talhões, estoque, atividades e equipe.

O proprietário acompanha a rotina da fazenda, cria tarefas e administra acessos. O funcionário recebe as tarefas da equipe, registra a jornada e atualiza o andamento do trabalho.

## Principais recursos

- Login por e-mail/senha ou Google.
- Cadastro de proprietário, fazenda e funcionários.
- Perfis separados para proprietário/gestor e funcionário.
- Confirmação de e-mail para liberar a gestão de equipe.
- Tarefas individuais e atividades para toda a fazenda.
- Registro de entrada e saída do funcionário.
- Diagnóstico de soja, análise de plantio e reconstrução 3D.
- Clima, diário de campo, mapa de áreas e estoque.
- PWA com possibilidade de instalação no navegador.

## Tecnologias

- React 18 e Vite
- Firebase Authentication e Firestore
- React Router
- Leaflet e Leaflet Draw
- Framer Motion, GSAP e Lottie
- `vite-plugin-pwa`

## Rodando localmente

Requisitos: Node.js 18 ou superior e npm.

```bash
npm install
npm run dev
```

Para conferir a versão de produção:

```bash
npm run build
npm run preview
```

## Configuração

O Firebase é inicializado em `src/services/firebase.js`. Para trabalhar com outro ambiente, atualize a configuração do Firebase e publique as regras de `firestore.rules`.

Alguns endpoints e dados institucionais podem ser definidos localmente em `.env`:

```env
VITE_SOJA_API_URL=
VITE_MONITORAMENTO_API_URL=
VITE_MODELO_3D_API_URL=
VITE_ZENITH_PHONE=
VITE_ZENITH_EMAIL=
VITE_ZENITH_INSTAGRAM=
```

`.env` e `.env.example` são ignorados pelo Git. Variáveis iniciadas por `VITE_` ficam visíveis no código entregue ao navegador; não use esse arquivo para segredos de servidor.

## Firebase

| Coleção | Finalidade |
| --- | --- |
| `users` | perfil, papel, equipe e status de acesso |
| `farms` | dados da propriedade |
| `tasks` | tarefas individuais de funcionários |
| `activities` | atividades gerais ou atribuídas |

Para publicar as regras:

```bash
firebase use zenith-agro
firebase deploy --only firestore:rules
```

Troque `zenith-agro` pelo identificador do seu projeto quando necessário.

## Rotas

| Rota | Área |
| --- | --- |
| `/` | apresentação |
| `/login` | acesso de proprietário ou funcionário |
| `/register` | cadastro do proprietário |
| `/cadastrar-fazenda` | cadastro da propriedade |
| `/home` | painel principal |
| `/explore` | serviços agrícolas |
| `/profile` | perfil e fazenda |
| `/equipe` | gestão de equipe |

## Estrutura

```text
src/
  pages/App/              telas roteadas
  components/App/         componentes e módulos
  services/               Firebase, APIs e regras de negócio
  styles/                 estilos globais e por módulo
firestore.rules           regras de acesso do Firestore
vite.config.js            build e PWA
vercel.json               deploy na Vercel
```

## Antes de publicar

1. Execute `npm run build`.
2. Publique `firestore.rules` se houver alteração de permissões.
3. Confira os domínios autorizados no Firebase Authentication.
4. Teste proprietário e funcionário em sessões separadas.
5. Teste confirmação de e-mail, tarefa, jornada e bloqueio de funcionário.

Leia [DOCUMENTACAO.md](./DOCUMENTACAO.md) para detalhes de permissões, dados e manutenção.
