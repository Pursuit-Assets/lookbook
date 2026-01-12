import { FixedSizeList } from 'react-window';

/**
 * VirtualizedList - Renders only visible items for better performance
 * Use this for long lists (100+ items) to improve rendering performance
 */
const VirtualizedList = ({ 
  items, 
  itemHeight = 120, 
  height = 600,
  renderItem,
  className = '',
  ...props 
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={className} style={{ height, width: '100%' }}>
      <FixedSizeList
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        {...props}
      >
        {({ index, style }) => {
          const item = items[index];
          return (
            <div style={style}>
              {renderItem(item, index)}
            </div>
          );
        }}
      </FixedSizeList>
    </div>
  );
};

export default VirtualizedList;
