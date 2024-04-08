const Order = require('../model/orderModel');
const Cart = require('../model/cartModel');
const Table = require('../model/tableModel');
const Dish = require('../model/dishesModel');
const cartModel = require('../model/cartModel');
const membershipModel = require('../model/membershipModel');
const userModel = require('../model/userModel');
const { responseError } = require('../utils/utility');
const orderModel = require('../model/orderModel');
const { query } = require('express');
const branchModel = require('../model/branchModel');

const createOrderForOffsite = async (req, res) => {
  try {
  } catch (error) {
    
  }
   
};
const getOrderDetailsBeforeCheckout = async (req, res) => {
   try {
    const { email, branchID,res_id } = req.params;

    const checkUser = await userModel.findOne({email : email});
    if(!checkUser){
        return res.status(401).json("Invalid User"); 
    };
    const checkCart = await cartModel.find({branchID : branchID , user_id : checkUser._id});

    const dishDataPromises = checkCart.map(async (cartItem, index) => {
      const dishData = await Dish
        .findById(cartItem.dish_id)
        .select("title img");

      // Check if dishData is null, if so, delete the corresponding cart item
      if (!dishData) {
        console.log(
          `Dish not found for cart item at index ${index}. Deleting...`
        );
        await cartModel.findByIdAndDelete(cartItem._id);
        return null; // Returning null if dishData is not found
      }

      return { ...cartItem.toObject(), 
        dishId: dishData._id,
        title: dishData.title,
      }; // Merge cartItem and dishData
    });

    // Wait for all promises to resolve
    const allDishDataWithCarts = await Promise.all(dishDataPromises);

    // console.log(allDishDataWithCarts); // This will contain merged properties of getCarts and dish_data for each cart item

    const validDishDataWithCarts = allDishDataWithCarts.filter(
      (item) => item !== null
    );


    const deleteCart = await cartModel.deleteMany({ user_id : checkUser._id, branchID: { $ne: branchID } }).exec();// Delete the user
    // Calculate the total price for all items
    let totalPrice = 0;
    for (const item of validDishDataWithCarts) {
      totalPrice += item.totalPrice;
    }
    const checkMembership = await membershipModel.findOne({ 
      res_id: res_id,
      'memberShip': { $elemMatch: { $eq: checkUser._id } } 
    });


    let discount;
    if(checkMembership){
      discount=((checkMembership.percentageOffer)/100)*totalPrice;
      if(discount > checkMembership.MaximumLimit_in_TK){
        discount =  checkMembership.MaximumLimit_in_TK ;
      }
      // totalPrice -= discount;
    }else{
       discount=0;
    }

 
    

    res.status(200).send({
      dishes : validDishDataWithCarts, 
      subtotal : parseFloat(totalPrice.toFixed(2)), 
      discount : parseFloat(discount.toFixed(2)), 
      total : parseFloat((totalPrice - discount).toFixed(2)),
    })


   } catch (error) {
    responseError(res, 500,error);
   }
};


const updateOrder = async (req, res) => {
  
  };
  
const readOrder = async (req, res) => {
    
  };
  
const deleteOrder = async (req, res) => {
    
  };
  


  const createOrderForOnsite = async (req, res) => {
    try {
      const {email} = req.params;
      const {table_id,branchID,res_id} = req.body;
  
      try {
        const user = await userModel.findOne({email: email});
        const checkCart = await cartModel.find({user_id : user?._id ,branchID:branchID});
        const data = await totalPriceAndItems(res_id, branchID,checkCart,user);

        const paymentTypesOfTheBranch = await branchModel.findById(branchID).select("paymentTypes");
        console.log(paymentTypesOfTheBranch)
        let order ;
        if(paymentTypesOfTheBranch?.paymentTypes == "PayLater"){
          const PreviousIncompletedOrder = await orderModel.findOne({res_id : res_id, branchID : branchID, user_id : user?._id});
          if(PreviousIncompletedOrder){
            console.log('pay Later+ prev order')
            const push_data = {
              finalPrice: data?.finalPrice +  PreviousIncompletedOrder.finalPrice,
              Items : [...PreviousIncompletedOrder?.Items , ...data?.Items],
              subTotalPrice : data?.subTotalPrice + PreviousIncompletedOrder.subTotalPrice,
              discountedPrice : data?.discountedPrice +  PreviousIncompletedOrder.discountedPrice,
              finalPrice : data?.finalPrice +  PreviousIncompletedOrder.finalPrice,
              table : table_id,}

              order = await orderModel.findByIdAndUpdate(PreviousIncompletedOrder._id ,{$set :push_data},{new:true});

          }else{
            console.log('pay Later+ no prev order')
            order = await  new orderModel({
              res_id,
              branchID,
              user_id: user?._id,
              address : user?.address, 
              phone : user?.phone,
              token: await generateToken(),
              finalPrice: data?.finalPrice,
              Items : data?.Items,
              vouchers : data?.vouchers,
              subTotalPrice : data?.subTotalPrice,
              discountedPrice : data?.discountedPrice,
              finalPrice : data?.finalPrice,
              status : "Payment Pending",
              cash_status : "Not Paid",
              type_of_payment: "Cash On Delivery (COD)",
              order_from : "ONSITE",
              table : table_id,
              
            }).save();


          }
        }else{
          console.log('pay first')
          order = await  new orderModel({
            res_id,
            branchID,
            user_id: user?._id,
            address : user?.address, 
            phone : user?.phone,
            token: await generateToken(),
            finalPrice: data?.finalPrice,
            Items : data?.Items,
            vouchers : data?.vouchers,
            subTotalPrice : data?.subTotalPrice,
            discountedPrice : data?.discountedPrice,
            finalPrice : data?.finalPrice,
            status : "Payment Pending",
            cash_status : "Not Paid",
            type_of_payment: "Cash On Delivery (COD)",
            order_from : "ONSITE",
            table : table_id,
          }).save();

        }
        const deleteCart = await cartModel.deleteMany({user_id : user?._id});
        res.status(200).send(order);
    
      } catch (error) {
        return responseError(res,500,error);
        
      }
  
    } catch (error) {
      responseError(res,500,error);
      
    }
     
  };



  const totalPriceAndItems = async (res_id,branchID,cartItems,user)=>{
    const dishDataPromises = cartItems.map(async (cartItem, index) => {
      const dishData = await Dish
        .findById(cartItem.dish_id)
        .select("title img");

      // Check if dishData is null, if so, delete the corresponding cart item
      if (!dishData) {
        console.log(
          `Dish not found for cart item at index ${index}. Deleting...`
        );
        await cartModel.findByIdAndDelete(cartItem._id);
        return null; // Returning null if dishData is not found
      }

      return { 
        dishId: dishData?._id,
        title: dishData?.title,
        img:  dishData?.img,
        addOn :  cartItem?.addons,
        options :  cartItem?.options,
        quantity : cartItem?.quantity,
        basePrice :  cartItem?.basePrice,
        extraPrice : cartItem?.extraPrice || 0,
        VAT : cartItem?.VAT,
        totalPrice : cartItem?.totalPrice,
        dishStatus : "Order-Placed",
        }; // Merge cartItem and dishData
    });

    // Wait for all promises to resolve
    const allDishDataWithCarts = await Promise.all(dishDataPromises);

    // console.log(allDishDataWithCarts); // This will contain merged properties of getCarts and dish_data for each cart item

    const validDishDataWithCarts = allDishDataWithCarts.filter(
      (item) => item !== null
    );
    // Calculate the total price for all items
    let totalPrice = 0;
    for (const item of validDishDataWithCarts) {
      totalPrice += item.totalPrice;
    }
    const checkMembership = await membershipModel.findOne({ 
      res_id: res_id,
      'memberShip': { $elemMatch: { $eq: user._id } } 
    });


    let discount;
    let vouchers = "";
    if(checkMembership){
      discount=((checkMembership.percentageOffer)/100)*totalPrice;
      if(discount > checkMembership.MaximumLimit_in_TK){
        discount =  checkMembership.MaximumLimit_in_TK ;
      }
      // totalPrice -= discount;
      vouchers = "MemberShip";
    }else{
       discount=0;
    }

    return {
      Items : validDishDataWithCarts,
      vouchers : vouchers,
      subTotalPrice : totalPrice,
      discountedPrice : discount,
      finalPrice :  totalPrice - discount,
    }
  }
  async function generateToken(res_id, branchID) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);


        const result = await orderModel.aggregate([
          {
            $match: {
              createdAt: { $gte: today }, // Filter orders for today or later
            },
          },
          {
            $sort: { createdAt: -1 }, // Sort in descending order based on createdAt timestamp
          },
          {
            $limit: 1, // Limit to only one result (the latest order)
          },
          {
            $project: {
              token: 1, // Include only the 'token' field in the result
            },
          },
        ]);



        console.log(result)
  
        let token;
  
        if (result.length>0) {
            // If there is a previous order for the day, increment its token
            token = result[0].token+ 1;
        } else {
            // If there are no previous orders for the day, start from 1
            token = 1;
        }
  
        return token;
    } catch (error) {
      responseError(res,500,error);
    }
}

const onGoingOrderForOnSite = async (req,res)=>{
  try {
    const {res_id,branchID,email} = req.params;
    const user = await userModel.findOne({ email : email });
    const allOrderOngoing = await orderModel.find({user_id:user?._id, status: { $ne: "Completed" } });
    res.status(200).send(allOrderOngoing);
  } catch (error) {
    responseError(res,500,error);
  }
}

const allCompleteOrderForOnSite = async (req,res)=>{
  try {
    const {res_id,branchID,email} = req.params;
    const user = await userModel.findOne({ email : email });
    const allOrderComplete = await orderModel.find({user_id:user?._id,status: "Completed"  });
    res.status(200).send(allOrderComplete);
  } catch (error) {
    responseError(res,500,error);
  }
}


module.exports = {
    getOrderDetailsBeforeCheckout,
    updateOrder,
    deleteOrder,
    readOrder,
    createOrderForOnsite,
    onGoingOrderForOnSite,
    allCompleteOrderForOnSite,
};
