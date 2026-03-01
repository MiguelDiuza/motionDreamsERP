# Motion Dreams Mini-ERP Structure (Next.js)

El frontend se encuentra en la carpeta `src/app/`. El punto de entrada principal es `src/app/page.tsx`.

src/
├── app/                 # El FRONTEND está aquí (Next.js App Router)
│   ├── layout.tsx       # Estilos globales y efectos de marca
│   ├── globals.css      # Configuraciones de Tailwind yScrollbar
│   └── page.tsx         # Dashboard Principal (Vista de inicio)
├── components/          # Componentes reutilizables
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── GlassCard.tsx    # Contenedor Glassmorphism (Implementado)
│   ├── clients/
│   │   ├── ClientTable.tsx  # Tabla con alertas (Implementado)
│   │   ├── AccountStatement.tsx
│   │   └── ActionButtons.tsx
│   ├── dashboard/
│   │   ├── FinancialSummary.tsx
│   │   └── MonthlyCutoff.tsx
│   ├── workflow/
│   │   ├── JobCard.tsx
│   │   └── KanbanBoard.tsx
│   └── ui/
│       ├── PriorityIcon.tsx # Fuego/Hielo (Implementado)
│       └── GeneratePDFButton.tsx
├── lib/                 # Lógica compartida
│   ├── pdfGenerator.js      # Generación de Estado de Cuenta (Implementado)
│   └── calculations.js      # Lógica FIFO (Implementado)
└── public/              # Imágenes y assets estáticos
