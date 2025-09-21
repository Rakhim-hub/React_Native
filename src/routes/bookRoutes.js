import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/book.js";
import protectRoute from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/", protectRoute, async (req, res) => {
    try {
        const { title, caption, rating, image } = req.body;

        if (!image || !title || !caption || !rating) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        // Upload the image to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        const imageUrl = uploadResponse.secure_url;

        // Save the book in database
        const newBook = new Book({
            title,
            caption,
            rating,
            image: imageUrl,
            user: req.user._id
        });

        await newBook.save();
        res.status(201).json(newBook);
    } catch (error) {
        console.error("Error creating book:", error);
        res.status(500).json({ message: error.message });
    }
});
//pagination => infinite loading
router.get("/",protectRoute,async(req,res)=>{
    try {
        const page=req.query.page||1;
        const limit=req.query.limit||5;
        const skip=(page-1)*limit;
        const books =await Book.find()
        .sort({createdAt:-1})//desc
        .skip(skip)
        .limit(limit)
        .populate("user","username profileImage");

        const totalBooks= await Book.countDocuments();
       res.json({
            books,
            currentPage: page,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
            });

    } catch (error) {
        console.log("Error in gettin books",error);
        res.status(500).json({message:"internal server error"});
    }
})
//delete books
router.delete("/:id",protectRoute,async (req,res)=>{
    try {
        const book =await Book.findById(req.params.id);
        if(!book) return res.status(404).json({message:"Book not found"});
  
        //check if user is the creator of the book
        if(book.user.toString() !=req.user._id.toString())
            return res.status(401).json({message:"Unauthorized"});
  
        //delete image from clouduinary as well
        if(book.image && book.image.includes("cloudinary")){
            try {
               const publicId= book.image.split("/").pop().split(".")[0];
               await cloudinary.uploader.destroy(publicId); 
            } catch (deleteError) {
                console.log("Error deleting image from cloudinary",deleteError);
            }
        }
        await book.deleteOne();
         res.json({message:"Book deleted successfully"});
  
    } catch (error) {

        console.log("Error deleting Book",error);
         res.status(500).json({message:"internal server error"});
  
    }
})
// Get recommended books (example: top rated books, excluding user's own books)
router.get("/user", protectRoute, async (req, res) => {
  try {
    // find top 5 books (not created by current user)
    const recommendedBooks = await Book.find({ user:req.user._id })
      .sort({ rating: -1, createdAt: -1 }) // sort by rating (high → low), then recent
      .limit(5)
      .populate("user", "username profileImage");

    res.json({ recommendedBooks });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
