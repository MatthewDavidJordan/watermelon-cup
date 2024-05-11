import './Ticker.css'

export const ThreeDigitTickerCell = ({ label, value }) => {
    const formattedValue = (value === null || value === undefined || value === 0 || isNaN(value)) 
    ? '0' : value.toString();

    return (
        <div className='tickerCell'>
            <span className='tickerCellValue'>{ formattedValue }</span>
            <span className='tickerCellLabel'>{ label }</span>
        </div>
    );
}