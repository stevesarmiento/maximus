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
    return null;
  }

  const filteredCommands = COMMANDS.filter(cmd => matchesFilter(cmd, filterText));

  return (
    <div className="command-palette">
      {filteredCommands.length === 0 ? (
        <div className="command-palette-empty">
          No commands found
        </div>
      ) : (
        filteredCommands.map((cmd, index) => (
          <div
            key={cmd.name}
            className="command-palette-item"
            data-selected={index === selectedIndex}
          >
            <div className="command-palette-item-name">
              {cmd.name}
            </div>
            <div className="command-palette-item-description">
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

