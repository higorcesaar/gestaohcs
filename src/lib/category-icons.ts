import moneyBag from "@/assets/3d/money-bag.png";
import house from "@/assets/3d/house.png";
import shoppingBagRed from "@/assets/3d/shopping-bag-red.png";
import cardsCalendar from "@/assets/3d/cards-calendar.png";
import lockCoins from "@/assets/3d/lock-coins.png";
import cartGreen from "@/assets/3d/cart-green.png";
import warning from "@/assets/3d/warning.png";
import car from "@/assets/3d/car.png";
import handbagOrange from "@/assets/3d/handbag-orange.png";
import plate from "@/assets/3d/plate.png";
import medical from "@/assets/3d/medical.png";
import piggy from "@/assets/3d/piggy.png";
import airplane from "@/assets/3d/airplane.png";
import clipboard from "@/assets/3d/clipboard.png";
import gift from "@/assets/3d/gift.png";
import receipts from "@/assets/3d/receipts.png";

export const I3D = {
  moneyBag, house, shoppingBagRed, cardsCalendar, lockCoins, cartGreen,
  warning, car, handbagOrange, plate, medical, piggy, airplane, clipboard,
  gift, receipts,
};

const MAP: Record<string, string> = {
  // Moradia/casa
  "moradia": house, "aluguel": house, "iptu": house, "energia": house,
  "água": house, "agua": house, "internet": house, "gás": house, "gas": house,
  "financiamento apto": house, "condomínio": house, "condominio": house,
  // Transporte
  "transporte": car, "uber": car, "99": car, "gasolina": car, "estacionamento": car,
  "ipva": car, "vem / recarga": car, "vem": car, "financiamento carro": car,
  // Alimentação
  "alimentação": plate, "alimentacao": plate, "mercado": plate, "feira": plate,
  "restaurante": plate, "lanches": plate, "padaria": plate, "ifood": plate,
  // Saúde
  "saúde": medical, "saude": medical, "plano de saúde": medical, "plano de saude": medical,
  "farmácia": medical, "farmacia": medical,
  // Lazer
  "lazer": handbagOrange, "cinema": handbagOrange, "streaming": handbagOrange,
  "shoppe": handbagOrange, "presentes": gift,
  // Cartão / parcelamento
  "cartão de crédito": cardsCalendar, "cartao de credito": cardsCalendar,
  "celular": cardsCalendar, "computador": cardsCalendar, "roupas": handbagOrange,
  "óculos": handbagOrange, "oculos": handbagOrange, "relógio": handbagOrange,
  // Viagem / poupança
  "viagem": airplane, "hospedagem": airplane, "reserva": piggy,
  // Receitas
  "salário": moneyBag, "salario": moneyBag, "freelance": moneyBag,
  "rendimento": moneyBag,
  // Genéricos
  "outros": gift, "doações": gift, "doacoes": gift, "dízimo": gift, "dizimo": gift,
  "oferta": gift, "mei": clipboard, "academia": handbagOrange,
  "barbearia": handbagOrange, "salão": handbagOrange, "salao": handbagOrange,
  "faculdade": clipboard, "educação": clipboard, "educacao": clipboard,
  "seguro": lockCoins, "consórcio": lockCoins, "consorcio": lockCoins,
  "dados móveis": cardsCalendar,
};

export function iconForCategory(category?: string | null): string {
  if (!category) return gift;
  const k = category.toLowerCase().trim();
  return MAP[k] ?? gift;
}
