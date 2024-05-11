import './Ticker.css'

export const TickerCell = ({ label, value }) => {
    const formattedValue = (value === null || value === undefined || value === 0 || isNaN(value)) 
    ? '00' : value < 10 ? `0${value}`: value.toString();

    return (
        <div className='tickerCell'>
            <span className='tickerCellValue'>{ formattedValue }</span>
            <span className='tickerCellLabel'>{ label }</span>
        </div>
    );
}