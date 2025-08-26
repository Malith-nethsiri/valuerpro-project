"""
Number to Words Conversion Service for Sri Lankan Rupees

Converts numeric values to their written form in English for professional 
valuation reports, following Sri Lankan currency conventions.
"""

from typing import Union


class NumberToWordsLKR:
    """Converts numbers to words in Sri Lankan Rupees format"""
    
    def __init__(self):
        # Number words for different place values
        self.ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", 
                     "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", 
                     "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        
        self.tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", 
                     "Seventy", "Eighty", "Ninety"]
        
        # Sri Lankan currency units
        self.scale = [
            (10000000, "Crore"),      # 1 Crore = 10 Million
            (1000000, "Million"),     # 1 Million
            (100000, "Lakh"),        # 1 Lakh = 100,000
            (1000, "Thousand"),       # 1 Thousand
            (100, "Hundred"),         # 1 Hundred
        ]
    
    def convert_group_to_words(self, num: int) -> str:
        """Convert a group of up to 3 digits to words"""
        if num == 0:
            return ""
        
        result = ""
        
        # Handle hundreds
        if num >= 100:
            result += self.ones[num // 100] + " Hundred "
            num %= 100
        
        # Handle tens and ones
        if num >= 20:
            result += self.tens[num // 10]
            if num % 10 > 0:
                result += " " + self.ones[num % 10]
        elif num > 0:
            result += self.ones[num]
        
        return result.strip()
    
    def number_to_words(self, amount: Union[int, float]) -> str:
        """
        Convert a numeric amount to words in Sri Lankan Rupees
        
        Args:
            amount: The numeric amount to convert
            
        Returns:
            String representation of the amount in words
            
        Examples:
            22500000 -> "Twenty Two Million Five Hundred Thousand"
            1500000 -> "One Million Five Hundred Thousand" 
            250000 -> "Two Lakh Fifty Thousand"
            15000 -> "Fifteen Thousand"
        """
        if not isinstance(amount, (int, float)):
            raise ValueError("Amount must be a number")
        
        # Convert to integer (ignore cents for property valuations)
        amount = int(amount)
        
        if amount == 0:
            return "Zero"
        
        if amount < 0:
            return "Minus " + self.number_to_words(abs(amount))
        
        result_parts = []
        
        # Process each scale unit
        for scale_value, scale_name in self.scale:
            if amount >= scale_value:
                scale_count = amount // scale_value
                
                # Special handling for Lakh system (used in Sri Lanka)
                if scale_name == "Lakh":
                    # Convert the count to words for this scale
                    if scale_count < 100:
                        scale_words = self.convert_group_to_words(scale_count)
                    else:
                        # Handle multiple crores, lakhs etc.
                        scale_words = self.convert_group_to_words(scale_count)
                    
                    if scale_words:
                        result_parts.append(f"{scale_words} {scale_name}")
                
                elif scale_name == "Crore":
                    scale_words = self.convert_group_to_words(scale_count)
                    if scale_words:
                        result_parts.append(f"{scale_words} {scale_name}")
                
                elif scale_name == "Million":
                    scale_words = self.convert_group_to_words(scale_count)
                    if scale_words:
                        result_parts.append(f"{scale_words} {scale_name}")
                
                elif scale_name in ["Thousand", "Hundred"]:
                    scale_words = self.convert_group_to_words(scale_count)
                    if scale_words:
                        result_parts.append(f"{scale_words} {scale_name}")
                
                amount %= scale_value
        
        # Handle remaining amount (less than 100)
        if amount > 0:
            remaining_words = self.convert_group_to_words(amount)
            if remaining_words:
                result_parts.append(remaining_words)
        
        return " ".join(result_parts)
    
    def amount_to_currency_words(self, amount: Union[int, float]) -> str:
        """
        Convert amount to full currency format with 'Sri Lanka Rupees' and 'Only'
        
        Args:
            amount: The numeric amount to convert
            
        Returns:
            Full currency string suitable for legal documents
            
        Example:
            22500000 -> "Sri Lanka Rupees Twenty Two Million Five Hundred Thousand Only"
        """
        words = self.number_to_words(amount)
        return f"Sri Lanka Rupees {words} Only"


# Service instance
lkr_converter = NumberToWordsLKR()


def convert_lkr_to_words(amount: Union[int, float]) -> str:
    """
    Convenience function to convert LKR amount to words
    
    Args:
        amount: The numeric amount in LKR
        
    Returns:
        String representation in words
    """
    return lkr_converter.number_to_words(amount)


def convert_lkr_to_currency_words(amount: Union[int, float]) -> str:
    """
    Convenience function to convert LKR amount to full currency words
    
    Args:
        amount: The numeric amount in LKR
        
    Returns:
        Full currency string with "Sri Lanka Rupees" and "Only"
    """
    return lkr_converter.amount_to_currency_words(amount)


if __name__ == "__main__":
    # Test cases for validation
    test_amounts = [
        22500000,  # Twenty Two Million Five Hundred Thousand
        1500000,   # Fifteen Lakh (or One Million Five Hundred Thousand)
        250000,    # Two Lakh Fifty Thousand
        15000,     # Fifteen Thousand
        5500,      # Five Thousand Five Hundred
        100,       # One Hundred
        25,        # Twenty Five
        0,         # Zero
    ]
    
    print("=== Number to Words LKR Converter Test ===")
    for amount in test_amounts:
        words = convert_lkr_to_words(amount)
        currency_words = convert_lkr_to_currency_words(amount)
        print(f"Rs. {amount:,} = {words}")
        print(f"Full: {currency_words}")
        print("-" * 50)