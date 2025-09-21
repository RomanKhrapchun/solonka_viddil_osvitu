import React, {useRef} from 'react';
import Button from "../common/Button/Button.jsx";
import {useNavigate, useParams} from "react-router-dom";
import './PrintCard.css'
import logo from '../../assets/qr-code.png'
import useFetch from "../../hooks/useFetch.jsx";
import {
    alt_qr_code,
    telegram_name, telegram_url,
    territory_title,
    territory_title_instrumental
} from "../../utils/communityConstants.jsx";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Loader from "../Loader/Loader.jsx";
import PageError from "../../pages/ErrorPage/PageError.jsx";
import {formatDateUa} from "../../utils/function.js";
const backIcon = generateIcon(iconMap.back)
const printIcon = generateIcon(iconMap.print)

const PrintUtilityCard = () => {
    const ref = useRef(null)
    const {id} = useParams()
    const navigate = useNavigate()
    const {error, status, data} = useFetch(`api/utilities/print/${id}`)
    const handlePrint = () => {
        if(ref.current) {
            ref.current.style.display = 'none';
        }
        window.print();
        if(ref.current) {
            ref.current.style.display = 'flex';
        }
    };

    if (status === STATUS.PENDING) {
        return <Loader/>
    }

    if (status === STATUS.ERROR) {
        return <div style={{display: 'flex', justifyContent: 'center', minHeight: '100vh'}}>
            <PageError statusError={error.status} title={error.message}/>
        </div>
    }

    return (
        <React.Fragment>
            {status === STATUS.SUCCESS ? (
                <React.Fragment>
                    <div className="print-card">
                        <div className="print-card__header">
                            <p className="print-card__name">{data.fio}</p>
                            <p className="print-card__id">і.к. {data?.payerident}</p>
                        </div>
                        <div className="print-card__title">Інформаційне повідомлення</div>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{territory_title} повідомляє, що відповідно до даних постачальників комунальних послуг,
    станом {data.date && !isNaN(new Date(data.date)) ? formatDateUa(new Date(data.date)) : "невідому дату"} 
    у Вас наявна заборгованість за комунальні послуги {territory_title_instrumental},&nbsp; а саме:
</p>
{data.debt && Array.isArray(data.debt) && data.debt.length ? (
    data.debt.map((el, index) => (
        <div className="print-card__content" key={index}>
            <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{el.debtText}</p>
            <p className="print-card__payment-title">{el.requisiteText}</p>
            <table className="print-card__table">
                <tbody>
                    {Array.isArray(el.table) ? (
                        el.table.map((cell, cellIndex) => (
                            <tr className="print-card__table-row" key={cellIndex}>
                                <td className="print-card__table-cell">
                                    <p><strong>{cell.label}</strong></p>
                                </td>
                                <td className="print-card__table-cell">
                                    <p>{cell.value}</p>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="2">Дані відсутні</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    ))
) : null}

                        <p>&nbsp;</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;В разі виникнення питань щодо заборгованості, звертайтесь до постачальника комунальних послуг.</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Просимо терміново погасити утворену Вами заборгованість за комунальні послуги {territory_title_instrumental}. Несвоєчасна сплата суми заборгованості може призвести до штрафних санкцій та припинення надання послуг.</p>
                        <p>&nbsp;</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Перевірити заборгованість можна у застосунках &laquo;{website_name}&raquo;
                            <a href={website_url} target={"_blank"}>{website_url}</a> та чат-боті в Telegram &laquo;{telegram_name}&raquo; <a href={telegram_url} target={"_blank"}>{telegram_url}</a>, які надають
                            можливість миттєвого отримання актуальної інформації про стан заборгованості за комунальні послуги,
                            реквізити для сплати та можливість оплатити онлайн або за QR-кодом, який розміщений нижче.
                        </p>
                        <div>
                            <img src={logo} width={100} height={100} alt={alt_qr_code}/>
                        </div>
                        <div className="print-card__buttons" ref={ref}>
                            <Button
                                icon={backIcon}
                                onClick={() => navigate('/utilities')}>
                                Повернутись
                            </Button>
                            <Button
                                icon={printIcon}
                                onClick={handlePrint}>
                                Друк
                            </Button>
                        </div>
                    </div>
                </React.Fragment>
            ) : null
            }
        </React.Fragment>)
};

export default PrintUtilityCard;
