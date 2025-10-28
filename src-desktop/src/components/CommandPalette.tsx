interface Command {
  name: string;
  description: string;
  aliases: string[];
}

interface CommandPaletteProps {
  isExpanded: boolean;
  filterText: string;
  selectedIndex: number;
}

const COMMANDS: Command[] = [
  { name: '/liveprices', aliases: ['live', 'prices', 'monitor'], description: 'Live price monitor - Top 25 tokens' },
  { name: '/balances', aliases: ['bal', 'wallet'], description: 'Show Solana wallet balances' },
  { name: '/transactions', aliases: ['txs', 'history'], description: 'Show recent Solana transactions' },
  { name: '/delegate', aliases: ['deleg'], description: 'Show delegation status' },
  { name: '/export-delegate', aliases: ['export'], description: 'Export delegate wallet for backup' },
  { name: '/import-delegate', aliases: ['import'], description: 'Import delegate wallet from backup' },
  { name: '/revoke', aliases: ['revoke-delegate'], description: 'Revoke current delegation' },
  { name: '/clear', aliases: ['reset'], description: 'Clear conversation memory' },
  { name: '/config', aliases: ['settings'], description: 'Open configuration settings' },
  { name: '/cost', aliases: ['usage', 'billing'], description: 'Show session cost and duration' },
  { name: '/exit', aliases: ['quit'], description: 'Exit MAXIMUS' },
];

function matchesFilter(command: Command, filter: string): boolean {
  if (!filter) return true;
  
  const filterLower = filter.toLowerCase();
  if (command.name.toLowerCase().includes(filterLower)) return true;
  if (command.description.toLowerCase().includes(filterLower)) return true;
  return command.aliases.some(alias => alias.toLowerCase().includes(filterLower));
}

export function CommandPalette({ isExpanded, filterText, selectedIndex }: CommandPaletteProps) {
  if (!isExpanded) {
    return (
      <div style={{
        padding: '10px 20px',
        fontSize: '0.75em',
        color: 'var(--text-muted)',
      }}>
        Type '/' to see all commands
      </div>
    );
  }

  const filteredCommands = COMMANDS.filter(cmd => matchesFilter(cmd, filterText));

  return (
    <div style={{
      padding: '10px 0',
      fontSize: '0.85em',
      maxHeight: '400px',
      overflowY: 'auto',
    }}>
      {filteredCommands.length === 0 ? (
        <div style={{ padding: '0 20px', color: 'var(--text-muted)' }}>
          No commands found
        </div>
      ) : (
        filteredCommands.map((cmd, index) => (
          <div
            key={cmd.name}
            style={{
              padding: '8px 20px',
              display: 'flex',
              gap: '20px',
              backgroundColor: index === selectedIndex ? 'rgba(255, 175, 95, 0.1)' : 'transparent',
              color: index === selectedIndex ? 'var(--accent-orange)' : 'var(--text-primary)',
            }}
          >
            <div style={{ width: '180px', flexShrink: 0 }}>
              {cmd.name}
            </div>
            <div style={{ color: index === selectedIndex ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
              {cmd.description}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export { COMMANDS };
export type { Command };

